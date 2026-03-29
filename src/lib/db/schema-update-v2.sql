-- RoboJunior — Schema Update v2: Missions Engine
-- Run this AFTER the initial supabase-schema.sql
-- Execute in Supabase Dashboard -> SQL Editor

-- ==============================
-- 1. ALTER mission_progress: add new columns
-- ==============================
ALTER TABLE public.mission_progress
  ADD COLUMN IF NOT EXISTS stars integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hints_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_clear_rewarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonus_objective_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonus_objective_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'easy';

-- Drop old unique constraint and add new one that includes difficulty
ALTER TABLE public.mission_progress
  DROP CONSTRAINT IF EXISTS mission_progress_user_id_role_mission_number_key;

ALTER TABLE public.mission_progress
  ADD CONSTRAINT mission_progress_user_role_mission_difficulty_key
  UNIQUE (user_id, role, mission_number, difficulty);

-- ==============================
-- 2. ALTER profiles: add new columns
-- ==============================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_skin text,
  ADD COLUMN IF NOT EXISTS equipped_frame text,
  ADD COLUMN IF NOT EXISTS title_key text,
  ADD COLUMN IF NOT EXISTS missions_without_hints integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_missions_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean NOT NULL DEFAULT true;

-- ==============================
-- 3. CREATE avatar_skins table
-- ==============================
CREATE TABLE IF NOT EXISTS public.avatar_skins (
  id text PRIMARY KEY,
  name_key text NOT NULL,
  rarity text NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'secret')),
  unlock_condition text NOT NULL,
  image_url text
);

ALTER TABLE public.avatar_skins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avatar skins viewable by everyone"
  ON public.avatar_skins FOR SELECT USING (true);

-- ==============================
-- 4. CREATE user_skins table
-- ==============================
CREATE TABLE IF NOT EXISTS public.user_skins (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skin_id text REFERENCES public.avatar_skins(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skin_id)
);

ALTER TABLE public.user_skins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skins"
  ON public.user_skins FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock skins"
  ON public.user_skins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================
-- 5. CREATE achievements table
-- ==============================
CREATE TABLE IF NOT EXISTS public.achievements (
  id text PRIMARY KEY,
  name_key text NOT NULL,
  description_key text NOT NULL,
  condition_type text NOT NULL,
  condition_value jsonb NOT NULL DEFAULT '{}',
  reward_skin_id text REFERENCES public.avatar_skins(id),
  reward_title_key text
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by everyone"
  ON public.achievements FOR SELECT USING (true);

-- ==============================
-- 6. CREATE user_achievements table
-- ==============================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id text REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock achievements"
  ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================
-- 7. CREATE onboarding_status table
-- ==============================
CREATE TABLE IF NOT EXISTS public.onboarding_status (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('drone_programmer', 'robot_constructor', 'entrepreneur')),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.onboarding_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding status"
  ON public.onboarding_status FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding status"
  ON public.onboarding_status FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding status"
  ON public.onboarding_status FOR UPDATE USING (auth.uid() = user_id);

-- ==============================
-- 8. Seed data: avatar_skins
-- ==============================
INSERT INTO public.avatar_skins (id, name_key, rarity, unlock_condition, image_url) VALUES
  -- Drone role skins
  ('drone_easy_skin', 'skins_drone_easy', 'common', 'complete_drone_easy_block', '/images/skins/drone_easy.png'),
  ('drone_medium_skin', 'skins_drone_medium', 'rare', 'complete_drone_medium_block', '/images/skins/drone_medium.png'),
  ('drone_hard_skin', 'skins_drone_hard', 'epic', 'complete_drone_hard_block', '/images/skins/drone_hard.png'),
  ('drone_all_skin', 'skins_drone_all', 'legendary', 'complete_drone_all', '/images/skins/drone_all.png'),
  -- Robot role skins
  ('robot_easy_skin', 'skins_robot_easy', 'common', 'complete_robot_easy_block', '/images/skins/robot_easy.png'),
  ('robot_medium_skin', 'skins_robot_medium', 'rare', 'complete_robot_medium_block', '/images/skins/robot_medium.png'),
  ('robot_hard_skin', 'skins_robot_hard', 'epic', 'complete_robot_hard_block', '/images/skins/robot_hard.png'),
  ('robot_all_skin', 'skins_robot_all', 'legendary', 'complete_robot_all', '/images/skins/robot_all.png'),
  -- Entrepreneur role skins
  ('entrepreneur_easy_skin', 'skins_entrepreneur_easy', 'common', 'complete_entrepreneur_easy_block', '/images/skins/entrepreneur_easy.png'),
  ('entrepreneur_medium_skin', 'skins_entrepreneur_medium', 'rare', 'complete_entrepreneur_medium_block', '/images/skins/entrepreneur_medium.png'),
  ('entrepreneur_hard_skin', 'skins_entrepreneur_hard', 'epic', 'complete_entrepreneur_hard_block', '/images/skins/entrepreneur_hard.png'),
  ('entrepreneur_all_skin', 'skins_entrepreneur_all', 'legendary', 'complete_entrepreneur_all', '/images/skins/entrepreneur_all.png'),
  -- Cross-role skins
  ('brics_founder_skin', 'skins_brics_founder', 'secret', 'complete_all_30_missions', '/images/skins/brics_founder.png')
ON CONFLICT (id) DO NOTHING;

-- ==============================
-- 9. Seed data: achievements
-- ==============================
INSERT INTO public.achievements (id, name_key, description_key, condition_type, condition_value, reward_skin_id, reward_title_key) VALUES
  ('drone_easy_block', 'achievements_drone_easy_block_name', 'achievements_drone_easy_block_desc', 'complete_missions', '{"role":"drone_programmer","missions":[1,2,3]}', 'drone_easy_skin', NULL),
  ('drone_medium_block', 'achievements_drone_medium_block_name', 'achievements_drone_medium_block_desc', 'complete_missions', '{"role":"drone_programmer","missions":[4,5,6]}', 'drone_medium_skin', NULL),
  ('drone_hard_block', 'achievements_drone_hard_block_name', 'achievements_drone_hard_block_desc', 'complete_missions', '{"role":"drone_programmer","missions":[7,8,9,10]}', 'drone_hard_skin', 'titles.master_pilot'),
  ('drone_all', 'achievements_drone_all_name', 'achievements_drone_all_desc', 'complete_all_role', '{"role":"drone_programmer"}', 'drone_all_skin', NULL),
  ('robot_easy_block', 'achievements_robot_easy_block_name', 'achievements_robot_easy_block_desc', 'complete_missions', '{"role":"robot_constructor","missions":[1,2,3]}', 'robot_easy_skin', NULL),
  ('robot_medium_block', 'achievements_robot_medium_block_name', 'achievements_robot_medium_block_desc', 'complete_missions', '{"role":"robot_constructor","missions":[4,5,6]}', 'robot_medium_skin', NULL),
  ('robot_hard_block', 'achievements_robot_hard_block_name', 'achievements_robot_hard_block_desc', 'complete_missions', '{"role":"robot_constructor","missions":[7,8,9,10]}', 'robot_hard_skin', 'titles.chief_engineer'),
  ('robot_all', 'achievements_robot_all_name', 'achievements_robot_all_desc', 'complete_all_role', '{"role":"robot_constructor"}', 'robot_all_skin', NULL),
  ('entrepreneur_easy_block', 'achievements_entrepreneur_easy_block_name', 'achievements_entrepreneur_easy_block_desc', 'complete_missions', '{"role":"entrepreneur","missions":[1,2,3]}', 'entrepreneur_easy_skin', NULL),
  ('entrepreneur_medium_block', 'achievements_entrepreneur_medium_block_name', 'achievements_entrepreneur_medium_block_desc', 'complete_missions', '{"role":"entrepreneur","missions":[4,5,6]}', 'entrepreneur_medium_skin', NULL),
  ('entrepreneur_hard_block', 'achievements_entrepreneur_hard_block_name', 'achievements_entrepreneur_hard_block_desc', 'complete_missions', '{"role":"entrepreneur","missions":[7,8,9,10]}', 'entrepreneur_hard_skin', 'titles.ceo'),
  ('entrepreneur_all', 'achievements_entrepreneur_all_name', 'achievements_entrepreneur_all_desc', 'complete_all_role', '{"role":"entrepreneur"}', 'entrepreneur_all_skin', NULL),
  ('brics_founder', 'achievements_brics_founder_name', 'achievements_brics_founder_desc', 'complete_all_missions', '{"total":30}', 'brics_founder_skin', 'titles.brics_founder'),
  ('no_hints_3', 'achievements_no_hints_3_name', 'achievements_no_hints_3_desc', 'missions_without_hints', '{"count":3}', NULL, NULL),
  ('no_hints_10', 'achievements_no_hints_10_name', 'achievements_no_hints_10_desc', 'missions_without_hints', '{"count":10}', NULL, 'titles.independent'),
  ('three_stars_5', 'achievements_three_stars_5_name', 'achievements_three_stars_5_desc', 'three_star_count', '{"count":5}', NULL, NULL),
  ('three_stars_15', 'achievements_three_stars_15_name', 'achievements_three_stars_15_desc', 'three_star_count', '{"count":15}', NULL, 'titles.perfectionist')
ON CONFLICT (id) DO NOTHING;
