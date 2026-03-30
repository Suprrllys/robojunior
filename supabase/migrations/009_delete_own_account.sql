-- Function to fully delete own account (profile + auth user)
-- Called via supabase.rpc('delete_own_account')
-- Uses SECURITY DEFINER to access auth.users (which normal users cannot)

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  -- Get the caller's user ID
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete profile first (ON DELETE CASCADE removes all related data:
  -- mission_progress, competency_scores, user_badges, coop_participants,
  -- chat_messages, coop_completed_missions, coop_sessions, user_skins,
  -- user_achievements, reports)
  delete from public.profiles where id = uid;

  -- Delete the auth user so the account cannot be reused
  delete from auth.users where id = uid;
end;
$$;
