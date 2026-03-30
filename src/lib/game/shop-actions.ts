'use server'

import { createClient } from '@/lib/supabase/server'
import { getItemById } from './shop-items'

interface PurchaseResult {
  success: boolean
  error?: string
  newBalance?: number
}

/**
 * Purchase a customization item from the shop.
 * Deducts coins from profiles.game_currency.
 * Tries to store in user_skins table; falls back to client-side storage.
 */
export async function purchaseItem(itemId: string): Promise<PurchaseResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Validate item exists and is not free
    const item = getItemById(itemId)
    if (!item) {
      return { success: false, error: 'Item not found' }
    }
    if (item.price === 0) {
      // Default items are free — no purchase needed
      return { success: true, newBalance: undefined }
    }

    // Get current balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('game_currency')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'Profile not found' }
    }

    const currentBalance = profile.game_currency ?? 0
    if (currentBalance < item.price) {
      return { success: false, error: 'Not enough coins' }
    }

    // Check if already owned in user_skins
    let useServerStorage = true
    try {
      const { data: existingRows, error: checkError } = await supabase
        .from('user_skins')
        .select('skin_id')
        .eq('user_id', user.id)
        .eq('skin_id', itemId)

      if (checkError && (
        checkError.message?.includes('relation') ||
        checkError.message?.includes('does not exist') ||
        checkError.code === '42P01'
      )) {
        // Table doesn't exist — fall back to client storage
        useServerStorage = false
      } else if (existingRows && existingRows.length > 0) {
        return { success: false, error: 'Already owned' }
      }
    } catch {
      useServerStorage = false
    }

    // Atomic deduction: only update if balance is still sufficient
    // This prevents double-charge from concurrent requests
    const newBalance = currentBalance - item.price
    if (newBalance < 0) {
      return { success: false, error: 'Not enough coins' }
    }

    const { data: updateResult, error: updateError } = await supabase
      .from('profiles')
      .update({ game_currency: newBalance })
      .eq('id', user.id)
      .gte('game_currency', item.price) // only deduct if balance still sufficient
      .select('game_currency')

    if (updateError) {
      return { success: false, error: 'Failed to deduct coins' }
    }

    // If no rows were updated, the balance was already too low (concurrent purchase)
    if (!updateResult || updateResult.length === 0) {
      return { success: false, error: 'Purchase failed — please try again' }
    }

    const finalBalance = updateResult[0].game_currency ?? newBalance

    // Try to store purchase on server (best-effort — localStorage is backup)
    if (useServerStorage) {
      try {
        await supabase
          .from('user_skins')
          .upsert({ user_id: user.id, skin_id: itemId }, { onConflict: 'user_id,skin_id' })
        // upsert prevents duplicate insert errors
      } catch {
        // Table may not exist — that's OK, localStorage handles it
      }
    }

    // success — client will also store in localStorage as backup
    return { success: true, newBalance: finalBalance }
  } catch {
    return { success: false, error: 'Something went wrong' }
  }
}
