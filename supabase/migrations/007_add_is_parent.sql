-- Add is_parent column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_parent boolean NOT NULL DEFAULT false;

-- Update the handle_new_user trigger to include is_parent from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, preferred_language, country, is_parent)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en'),
    coalesce(new.raw_user_meta_data->>'country', 'OTHER'),
    coalesce((new.raw_user_meta_data->>'is_parent')::boolean, false)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
