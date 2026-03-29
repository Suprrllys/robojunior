-- Add stars and total_session_score columns to coop_completed_missions
-- Stars are calculated from total session score: 1 star = 50%+, 2 stars = 75%+, 3 stars = 95%+
-- Max session score = 1000 * number of players (2000 for 2 players, 3000 for 3)

ALTER TABLE public.coop_completed_missions
  ADD COLUMN IF NOT EXISTS stars INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_session_score INTEGER NOT NULL DEFAULT 0;

-- Allow update on coop_completed_missions (for upsert with new columns)
CREATE POLICY "Users can update own coop completions" ON public.coop_completed_missions
  FOR UPDATE USING (auth.uid() = user_id);
