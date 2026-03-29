'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Equip or unequip an avatar skin for the current user.
 * Pass null to unequip.
 */
export async function equipSkin(skinId: string | null): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false }
  }

  // If equipping, verify the user owns this skin
  if (skinId) {
    try {
      const { data: owned, error } = await supabase
        .from('user_skins')
        .select('skin_id')
        .eq('user_id', user.id)
        .eq('skin_id', skinId)
        .single()

      // If table doesn't exist or skin not owned, deny
      if (error || !owned) {
        return { success: false }
      }
    } catch {
      return { success: false }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ equipped_skin: skinId })
    .eq('id', user.id)

  return { success: !error }
}
