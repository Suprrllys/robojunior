-- Fix: non-creator participants can't see teammates in active sessions
--
-- The old policy allowed seeing other participants only if:
--   1) it's your own row, OR
--   2) you're the session creator, OR
--   3) session status = 'waiting'
--
-- This means when a session becomes 'active', guests can only see themselves.
-- Fix: also allow if user is a participant in the same session (using the
-- existing SECURITY DEFINER function to avoid RLS recursion).

DROP POLICY IF EXISTS "Participants viewable by session members" ON public.coop_participants;

CREATE POLICY "Participants viewable by session members" ON public.coop_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_coop_participant(coop_session_id)
  );
