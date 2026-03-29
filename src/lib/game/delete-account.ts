'use server'

import { createClient } from '@/lib/supabase/server'

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Delete the profile row — ON DELETE CASCADE handles related tables
  const { error: deleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', user.id)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  // Sign out the user
  await supabase.auth.signOut()

  return { success: true }
}
