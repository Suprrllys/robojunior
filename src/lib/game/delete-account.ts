'use server'

import { createClient } from '@/lib/supabase/server'

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Block deletion of demo account
  if (user.email === 'team13innovatika@mail.ru') {
    return { success: false, error: 'Demo account cannot be deleted' }
  }

  // Delete via RPC function that removes both profile (cascading all data)
  // AND the auth.users entry so the account cannot be reused
  const { error: rpcError } = await supabase.rpc('delete_own_account')

  if (rpcError) {
    // Fallback: try deleting just the profile (cascade handles related tables)
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }
  }

  // Sign out the user
  await supabase.auth.signOut()

  return { success: true }
}
