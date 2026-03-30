-- Fix: non-participants can't see who's in a waiting session
-- This means the lobby shows all roles as "free" even when some are taken,
-- leading to duplicate roles when joining.
--
-- Solution: allow viewing participants in waiting sessions (they're public anyway)

DROP POLICY IF EXISTS "Participants viewable by session members" ON public.coop_participants;

CREATE POLICY "Participants viewable by session members" ON public.coop_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_coop_participant(coop_session_id)
    OR EXISTS (
      SELECT 1 FROM public.coop_sessions cs
      WHERE cs.id = coop_session_id AND cs.status = 'waiting'
    )
  );
