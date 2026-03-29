-- Fix: infinite recursion in RLS policies for coop_participants / coop_sessions
-- The old policies had circular references:
--   coop_sessions SELECT → reads coop_participants → coop_participants SELECT → reads coop_participants (self!) → infinite loop
--
-- Solution: use a SECURITY DEFINER function to check participation without triggering RLS

-- 1. Create helper function that bypasses RLS to check if user is a participant
CREATE OR REPLACE FUNCTION public.is_coop_participant(session_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM coop_participants
    WHERE coop_session_id = session_id AND user_id = auth.uid()
  );
$$;

-- 2. Drop old problematic policies
DROP POLICY IF EXISTS "Waiting sessions are public" ON public.coop_sessions;
DROP POLICY IF EXISTS "Coop sessions viewable by participants" ON public.coop_sessions;
DROP POLICY IF EXISTS "Participants can update session" ON public.coop_sessions;
DROP POLICY IF EXISTS "Participants viewable by session members" ON public.coop_participants;

-- 3. Recreate coop_sessions SELECT (no direct reference to coop_participants)
CREATE POLICY "Coop sessions viewable" ON public.coop_sessions
  FOR SELECT USING (
    auth.uid() = created_by
    OR status = 'waiting'
    OR public.is_coop_participant(id)
  );

-- 4. Recreate coop_sessions UPDATE (uses helper function)
CREATE POLICY "Participants can update session" ON public.coop_sessions
  FOR UPDATE USING (
    auth.uid() = created_by
    OR public.is_coop_participant(id)
  );

-- 5. Recreate coop_participants SELECT (no self-reference)
CREATE POLICY "Participants viewable by session members" ON public.coop_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.coop_sessions cs
      WHERE cs.id = coop_session_id
        AND (cs.created_by = auth.uid() OR cs.status = 'waiting')
    )
  );
