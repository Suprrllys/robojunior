-- Fix: hints_used column missing from mission_progress table.
-- Without it, dashboard always shows "0 missions without hints" because the query returns no data.

ALTER TABLE public.mission_progress
  ADD COLUMN IF NOT EXISTS hints_used integer NOT NULL DEFAULT -1;

-- Also ensure profiles has missions_without_hints counter
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS missions_without_hints integer NOT NULL DEFAULT 0;

-- Backfill: mark old missions as "not tracked" (-1) so they don't inflate the counter.
-- Only missions completed AFTER this migration will have real hints_used values (0+).
UPDATE public.mission_progress
SET hints_used = -1
WHERE status = 'completed' AND hints_used = 0;
