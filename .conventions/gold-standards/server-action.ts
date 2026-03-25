// GOLD STANDARD: Server Action Pattern
// Reference: src/lib/game/shop.ts
//
// Server actions use 'use server' directive with Supabase server client.
// Return typed results, handle errors gracefully.

'use server'

import { createClient } from '@/lib/supabase/server'

// Pattern: typed return with success/error
export async function exampleAction(
  userId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Unexpected error' }
  }
}

// KEY RULES:
// 1. Always 'use server' at top
// 2. Always use createClient() from '@/lib/supabase/server' (NOT client)
// 3. Always try/catch around Supabase calls
// 4. Return typed { success, error? } objects — never throw
// 5. Never expose raw Supabase errors to client
