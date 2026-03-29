/**
 * Schema Migration v2 — Apply Instructions
 *
 * This migration adds tables for: avatar_skins, user_skins, achievements, user_achievements,
 * onboarding_status, and new columns on profiles and mission_progress.
 *
 * HOW TO APPLY:
 *
 * 1. Go to your Supabase Dashboard: https://app.supabase.com
 * 2. Select your project
 * 3. Navigate to SQL Editor (left sidebar)
 * 4. Click "New query"
 * 5. Copy-paste the entire contents of: src/lib/db/schema-update-v2.sql
 * 6. Click "Run" (or press Ctrl+Enter)
 * 7. Verify success: you should see "Success. No rows returned" (for CREATE/ALTER statements)
 *
 * VERIFICATION — run this query after migration to confirm tables exist:
 *
 *   SELECT table_name FROM information_schema.tables
 *   WHERE table_schema = 'public'
 *   AND table_name IN ('avatar_skins', 'user_skins', 'achievements', 'user_achievements', 'onboarding_status');
 *
 * You should see all 5 tables listed.
 *
 * To verify seed data:
 *
 *   SELECT count(*) FROM avatar_skins;   -- Should be 13
 *   SELECT count(*) FROM achievements;    -- Should be 17
 */

// This file is for documentation only. The migration should be run
// directly in the Supabase SQL Editor as described above.
export {}
