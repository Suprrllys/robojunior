-- Add score column to coop_participants so players can see each other's scores
-- The code already writes to this column but it didn't exist in the schema

ALTER TABLE public.coop_participants
  ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT NULL;
