'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Saves the full avatar customization config to the profiles table.
 * Uses the avatar_accessory text field to store JSON.
 */
export async function saveAvatarToDB(config: Record<string, string>): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_accessory: JSON.stringify(config) })
    .eq('id', user.id)

  return !error
}
