-- 1. Add difficulty to mission_progress
ALTER TABLE mission_progress ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'medium';
UPDATE mission_progress SET difficulty = 'medium' WHERE difficulty IS NULL;
ALTER TABLE mission_progress DROP CONSTRAINT IF EXISTS mission_progress_user_id_role_mission_number_key;
ALTER TABLE mission_progress ADD CONSTRAINT mission_progress_user_role_mission_difficulty_key UNIQUE (user_id, role, mission_number, difficulty);

-- 2. Add difficulty to coop_sessions
ALTER TABLE coop_sessions ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'medium';

-- 3. Add show_on_leaderboard to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_on_leaderboard BOOLEAN NOT NULL DEFAULT true;

-- 4. Shop items table
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('accessory', 'skin', 'effect')),
  price INTEGER NOT NULL DEFAULT 25,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic')),
  asset_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. User inventory table
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  equipped BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, item_id)
);

-- 6. RLS policies
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_items_public_read" ON shop_items FOR SELECT USING (true);

ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_inventory_own" ON user_inventory FOR ALL USING (auth.uid() = user_id);

-- 7. Public profiles view (safe columns only — no email, parent_id, age)
CREATE OR REPLACE VIEW public_profiles AS
  SELECT id, username, country, avatar_color, avatar_accessory, xp, game_currency, show_on_leaderboard
  FROM profiles WHERE show_on_leaderboard = true;

-- 8. increment_xp RPC (fixes double-count bug)
CREATE OR REPLACE FUNCTION increment_xp(p_user_id UUID, p_amount INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET xp = xp + p_amount WHERE id = p_user_id;
END;
$$;

-- 9. increment_currency RPC
CREATE OR REPLACE FUNCTION increment_currency(p_user_id UUID, p_amount INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET game_currency = game_currency + p_amount WHERE id = p_user_id;
END;
$$;

-- 10. purchase_item RPC (atomic with row lock)
CREATE OR REPLACE FUNCTION purchase_item(p_user_id UUID, p_item_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_price INTEGER;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Check item exists and get price
  SELECT price INTO v_price FROM shop_items WHERE id = p_item_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;

  -- Check not already owned
  IF EXISTS (SELECT 1 FROM user_inventory WHERE user_id = p_user_id AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Item already owned';
  END IF;

  -- Lock user row and check balance
  SELECT game_currency INTO v_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance < v_price THEN RAISE EXCEPTION 'Insufficient funds'; END IF;

  -- Deduct currency
  UPDATE profiles SET game_currency = game_currency - v_price WHERE id = p_user_id
  RETURNING game_currency INTO v_new_balance;

  -- Add to inventory
  INSERT INTO user_inventory (user_id, item_id) VALUES (p_user_id, p_item_id);

  RETURN json_build_object('new_balance', v_new_balance);
END;
$$;

-- 11. Seed shop items
INSERT INTO shop_items (key, name_en, name_ru, name_ar, description_en, category, price, rarity, asset_key) VALUES
  ('antenna_classic', 'Classic Antenna', 'Классическая антенна', 'هوائي كلاسيكي', 'Simple signal antenna', 'accessory', 10, 'common', 'antenna_classic'),
  ('hat_engineer', 'Engineer Hard Hat', 'Каска инженера', 'خوذة المهندس', 'Safety first!', 'accessory', 20, 'common', 'hat_engineer'),
  ('visor_cyber', 'Cyber Visor', 'Кибер-визор', 'قناع سايبر', 'High-tech eye protection', 'accessory', 35, 'rare', 'visor_cyber'),
  ('wings_jetpack', 'Mini Jetpack', 'Мини-реактивный ранец', 'حقيبة نفاثة صغيرة', 'Boost your robot', 'accessory', 50, 'rare', 'wings_jetpack'),
  ('crown_champion', 'Champion Crown', 'Корона чемпиона', 'تاج البطل', 'For the best engineers', 'accessory', 100, 'epic', 'crown_champion'),
  ('skin_gold', 'Gold Plating', 'Золотое покрытие', 'طلاء ذهبي', 'Make your robot shine', 'skin', 75, 'rare', 'skin_gold'),
  ('skin_camo', 'Desert Camo', 'Пустынный камуфляж', 'تمويه صحراوي', 'Blend into the sands of NEOM', 'skin', 45, 'common', 'skin_camo')
ON CONFLICT (key) DO NOTHING;
