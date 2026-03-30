-- Fix: public profiles show 0 missions and no achievements for other users
-- because mission_progress SELECT policy only allows viewing own data.
-- Mission progress is not sensitive — make it viewable by all authenticated users.

DROP POLICY IF EXISTS "Users can view own mission progress" ON public.mission_progress;

CREATE POLICY "Mission progress viewable by authenticated users" ON public.mission_progress
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Also make user_achievements viewable by all authenticated users
-- so public profiles can show coop achievements too.
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;

CREATE POLICY "Achievements viewable by authenticated users" ON public.user_achievements
  FOR SELECT USING (auth.uid() IS NOT NULL);
