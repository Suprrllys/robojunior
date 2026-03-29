import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import SkinShop from '@/components/game/SkinShop'

export default async function ShopPage() {
  const t = await getTranslations('shop')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('game_currency, avatar_accessory, avatar_color')
    .eq('id', user!.id)
    .single()

  // Get owned items from user_skins — may fail if table doesn't exist
  let ownedSkinIds: string[] = []
  try {
    const { data, error } = await supabase
      .from('user_skins')
      .select('skin_id')
      .eq('user_id', user!.id)
    if (!error && data) {
      ownedSkinIds = data.map(s => s.skin_id)
    }
  } catch {
    // table missing — client will use localStorage
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">{t('title')}</h1>
        <p className="text-gray-400 mt-1">{t('subtitle')}</p>
      </div>
      <SkinShop
        balance={profile?.game_currency ?? 0}
        ownedSkinIds={ownedSkinIds}
        equippedSkinId={null}
        dbAvatarAccessory={profile?.avatar_accessory ?? null}
        avatarColor={profile?.avatar_color ?? '#3B82F6'}
      />
    </div>
  )
}
