'use server'
import { createClient } from '@/lib/supabase/server'
import type { ShopItem, InventoryItem } from '@/types/game'

export async function getShopItems(): Promise<ShopItem[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('shop_items').select('*').eq('is_active', true).order('price')
  return (data ?? []) as ShopItem[]
}

export async function getUserInventory(userId: string): Promise<InventoryItem[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('user_inventory').select('*, item:shop_items(*)').eq('user_id', userId)
  return (data ?? []) as InventoryItem[]
}

export async function purchaseItem(userId: string, itemId: string): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('purchase_item', { p_user_id: userId, p_item_id: itemId })
  if (error) return { success: false, error: error.message }
  return { success: true, newBalance: data?.new_balance }
}

export async function equipItem(userId: string, itemId: string): Promise<void> {
  const supabase = await createClient()
  // Unequip all items in same category first
  const { data: item } = await supabase.from('shop_items').select('category').eq('id', itemId).single()
  if (item) {
    const { data: catItems } = await supabase.from('user_inventory')
      .select('id, item:shop_items(category)')
      .eq('user_id', userId) as { data: { id: string; item: { category: string } | null }[] | null }
    const sameCategory = catItems?.filter(i => i.item?.category === item.category).map(i => i.id) ?? []
    if (sameCategory.length > 0) {
      await supabase.from('user_inventory').update({ equipped: false }).in('id', sameCategory)
    }
  }
  await supabase.from('user_inventory').update({ equipped: true }).eq('user_id', userId).eq('item_id', itemId)
}
