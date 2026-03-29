-- Fix: handle_new_user trigger was not saving country from registration metadata.
-- This caused BRICS United achievement to never trigger (all users had country = 'OTHER').

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, preferred_language, country)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en'),
    coalesce(new.raw_user_meta_data->>'country', 'OTHER')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Backfill: update existing profiles that have country='OTHER' but have country in auth metadata
UPDATE public.profiles p
SET country = coalesce((SELECT raw_user_meta_data->>'country' FROM auth.users u WHERE u.id = p.id), 'OTHER')
WHERE p.country = 'OTHER' OR p.country IS NULL;
