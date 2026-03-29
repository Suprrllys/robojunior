// Visual customization items for the character shop

export type ItemCategory = 'heads' | 'eyes' | 'outfits' | 'accessories' | 'heldItems' | 'effects'

export interface ShopItem {
  id: string
  category: ItemCategory
  nameKey: string        // translation key under "shop.items.{id}"
  price: number          // 0 = default/free
  isDefault?: boolean    // true for the free default in each category
  // Visual properties used by the avatar renderer
  visual: Record<string, string | number>
}

export const CATEGORY_INFO: Record<ItemCategory, { labelKey: string; icon: string; color: string }> = {
  heads:       { labelKey: 'shop.categories.heads',       icon: '🗣️', color: '#3B82F6' },
  eyes:        { labelKey: 'shop.categories.eyes',        icon: '👁️', color: '#8B5CF6' },
  outfits:     { labelKey: 'shop.categories.outfits',     icon: '👕', color: '#10B981' },
  accessories: { labelKey: 'shop.categories.accessories', icon: '🎩', color: '#F59E0B' },
  heldItems:   { labelKey: 'shop.categories.heldItems',   icon: '🔧', color: '#EF4444' },
  effects:     { labelKey: 'shop.categories.effects',     icon: '✨', color: '#EC4899' },
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── Heads ──
  { id: 'head_round',    category: 'heads', nameKey: 'head_round',    price: 0,  isDefault: true,  visual: { headStyle: 'round' } },
  { id: 'head_square',   category: 'heads', nameKey: 'head_square',   price: 25, visual: { headStyle: 'square' } },
  { id: 'head_pointed',  category: 'heads', nameKey: 'head_pointed',  price: 35, visual: { headStyle: 'pointed' } },
  { id: 'head_dome',     category: 'heads', nameKey: 'head_dome',     price: 50, visual: { headStyle: 'dome' } },
  { id: 'head_horned',   category: 'heads', nameKey: 'head_horned',   price: 60, visual: { headStyle: 'horned' } },
  { id: 'head_cat',      category: 'heads', nameKey: 'head_cat',      price: 75, visual: { headStyle: 'cat' } },

  // ── Eyes ──
  { id: 'eyes_circle',   category: 'eyes', nameKey: 'eyes_circle',   price: 0,  isDefault: true,  visual: { eyeStyle: 'circle' } },
  { id: 'eyes_visor',    category: 'eyes', nameKey: 'eyes_visor',    price: 15, visual: { eyeStyle: 'visor' } },
  { id: 'eyes_angry',    category: 'eyes', nameKey: 'eyes_angry',    price: 20, visual: { eyeStyle: 'angry' } },
  { id: 'eyes_happy',    category: 'eyes', nameKey: 'eyes_happy',    price: 25, visual: { eyeStyle: 'happy' } },
  { id: 'eyes_glasses',  category: 'eyes', nameKey: 'eyes_glasses',  price: 50, visual: { eyeStyle: 'glasses' } },

  // ── Outfits ──
  { id: 'outfit_none',      category: 'outfits', nameKey: 'outfit_none',      price: 0,   isDefault: true,  visual: { outfit: 'none' } },
  { id: 'outfit_tshirt',    category: 'outfits', nameKey: 'outfit_tshirt',    price: 30,  visual: { outfit: 'tshirt' } },
  { id: 'outfit_hoodie',    category: 'outfits', nameKey: 'outfit_hoodie',    price: 40,  visual: { outfit: 'hoodie' } },
  { id: 'outfit_labcoat',   category: 'outfits', nameKey: 'outfit_labcoat',   price: 50,  visual: { outfit: 'labcoat' } },
  { id: 'outfit_suit',      category: 'outfits', nameKey: 'outfit_suit',      price: 75,  visual: { outfit: 'suit' } },
  { id: 'outfit_armor',     category: 'outfits', nameKey: 'outfit_armor',     price: 100, visual: { outfit: 'armor' } },
  { id: 'outfit_spacesuit', category: 'outfits', nameKey: 'outfit_spacesuit', price: 120, visual: { outfit: 'spacesuit' } },
  { id: 'outfit_cape',      category: 'outfits', nameKey: 'outfit_cape',      price: 150, visual: { outfit: 'cape' } },

  // ── Accessories ──
  { id: 'acc_none',       category: 'accessories', nameKey: 'acc_none',       price: 0,  isDefault: true,  visual: { accessory: 'none' } },
  { id: 'acc_antenna',    category: 'accessories', nameKey: 'acc_antenna',    price: 20, visual: { accessory: 'antenna' } },
  { id: 'acc_hardhat',    category: 'accessories', nameKey: 'acc_hardhat',    price: 30, visual: { accessory: 'hardhat' } },
  { id: 'acc_headphones', category: 'accessories', nameKey: 'acc_headphones', price: 40, visual: { accessory: 'headphones' } },
  { id: 'acc_halo',       category: 'accessories', nameKey: 'acc_halo',      price: 60, visual: { accessory: 'halo' } },
  { id: 'acc_crown',      category: 'accessories', nameKey: 'acc_crown',      price: 80, visual: { accessory: 'crown' } },

  // ── Held Items ──
  { id: 'held_none',      category: 'heldItems', nameKey: 'held_none',      price: 0,   isDefault: true,  visual: { heldItem: 'none' } },
  { id: 'held_wrench',    category: 'heldItems', nameKey: 'held_wrench',    price: 25,  visual: { heldItem: 'wrench' } },
  { id: 'held_laptop',    category: 'heldItems', nameKey: 'held_laptop',    price: 35,  visual: { heldItem: 'laptop' } },
  { id: 'held_briefcase', category: 'heldItems', nameKey: 'held_briefcase', price: 40,  visual: { heldItem: 'briefcase' } },
  { id: 'held_sword',     category: 'heldItems', nameKey: 'held_sword',     price: 75,  visual: { heldItem: 'sword' } },
  { id: 'held_shield',    category: 'heldItems', nameKey: 'held_shield',    price: 100, visual: { heldItem: 'shield' } },

  // ── Effects ──
  { id: 'effect_none',     category: 'effects', nameKey: 'effect_none',     price: 0,   isDefault: true,  visual: { effect: 'none' } },
  { id: 'effect_sparkles', category: 'effects', nameKey: 'effect_sparkles', price: 50,  visual: { effect: 'sparkles' } },
  { id: 'effect_flames',   category: 'effects', nameKey: 'effect_flames',   price: 100, visual: { effect: 'flames' } },
  { id: 'effect_electric', category: 'effects', nameKey: 'effect_electric', price: 150, visual: { effect: 'electric' } },
  { id: 'effect_smoke',    category: 'effects', nameKey: 'effect_smoke',    price: 200, visual: { effect: 'smoke' } },
]

export function getItemsByCategory(category: ItemCategory): ShopItem[] {
  return SHOP_ITEMS.filter(item => item.category === category)
}

export function getItemById(itemId: string): ShopItem | undefined {
  return SHOP_ITEMS.find(item => item.id === itemId)
}

// Avatar customization state stored in localStorage
export interface AvatarConfig {
  headStyle: string
  eyeStyle: string
  outfit: string
  accessory: string
  heldItem: string
  effect: string
}

export const DEFAULT_AVATAR: AvatarConfig = {
  headStyle: 'round',
  eyeStyle: 'circle',
  outfit: 'none',
  accessory: 'none',
  heldItem: 'none',
  effect: 'none',
}

const AVATAR_STORAGE_KEY = 'robojunior_avatar'
const INVENTORY_STORAGE_KEY = 'robojunior_inventory'

export function loadAvatarConfig(): AvatarConfig {
  if (typeof window === 'undefined') return DEFAULT_AVATAR
  try {
    const stored = localStorage.getItem(AVATAR_STORAGE_KEY)
    if (stored) return { ...DEFAULT_AVATAR, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return DEFAULT_AVATAR
}

export function saveAvatarConfig(config: AvatarConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(config))
  } catch { /* ignore */ }
}

export function loadInventory(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(INVENTORY_STORAGE_KEY)
    if (stored) return new Set(JSON.parse(stored))
  } catch { /* ignore */ }
  return new Set()
}

export function saveInventory(inventory: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(Array.from(inventory)))
  } catch { /* ignore */ }
}
