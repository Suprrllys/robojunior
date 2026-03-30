'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Check if a username is available (not taken by another user).
 * Optionally exclude current user's ID (for profile editing).
 */
export async function checkUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .limit(1)

  if (excludeUserId) {
    query = query.neq('id', excludeUserId)
  }

  const { data } = await query
  return !data || data.length === 0
}
