-- Coop rewards infrastructure:
-- 1. Add coop_missions_completed counter to profiles
-- 2. Add coop_completed_missions tracking table for achievements
-- 3. RLS policy for delete on coop_participants (for leaving sessions)
-- 4. Auto-abandon stale waiting sessions

-- 1. Counter on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coop_missions_completed INTEGER NOT NULL DEFAULT 0;

-- 2. Track which coop mission templates each user completed (for achievements)
CREATE TABLE IF NOT EXISTS public.coop_completed_missions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  coop_session_id uuid REFERENCES public.coop_sessions(id) ON DELETE CASCADE NOT NULL,
  mission_template TEXT NOT NULL,
  role TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  partner_country TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, coop_session_id)
);

ALTER TABLE public.coop_completed_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coop completions" ON public.coop_completed_missions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coop completions" ON public.coop_completed_missions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Allow participants to delete themselves from waiting sessions (leave)
CREATE POLICY "Users can leave waiting sessions" ON public.coop_participants
  FOR DELETE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.coop_sessions cs
      WHERE cs.id = coop_session_id AND cs.status = 'waiting'
    )
  );

-- 4. Allow creators to update their own sessions to abandoned
-- (the existing update policy already covers this via created_by check)
