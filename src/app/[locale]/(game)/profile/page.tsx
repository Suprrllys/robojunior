import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import ProfileEditor from '@/components/game/ProfileEditor'
import RobotAvatar from '@/components/game/RobotAvatar'
import type { Role } from '@/types/database'

export default async function ProfilePage() {
  const t = await getTranslations('profile')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const { data: children } = await supabase
    .from('profiles')
    .select('id, username, xp, country')
    .eq('parent_id', user!.id)

  const roles: Role[] = ['drone_programmer', 'robot_constructor', 'entrepreneur']

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">{t('title')}</h1>
      </div>

      {/* Avatar preview row */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('customizeAvatar')}</h2>
        <div className="flex gap-8 justify-center flex-wrap">
          {roles.map(role => (
            <div key={role} className="text-center">
              <RobotAvatar
                role={role}
                color={profile?.avatar_color || '#1E90FF'}
                accessory={profile?.avatar_accessory || 'none'}
                size={72}
                animated
              />
              <p className="text-xs text-gray-400 mt-2">
                {role === 'drone_programmer' ? '🛸' : role === 'robot_constructor' ? '🤖' : '💡'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Profile editor */}
      {profile && <ProfileEditor profile={profile} />}

      {/* Parental controls */}
      {(children && children.length > 0) && (
        <div className="bg-brand-panel border border-brand-border rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t('parentControls')}</h2>
          <h3 className="text-sm font-medium text-gray-400 mb-3">{t('linkedChildren')}</h3>
          <div className="space-y-2">
            {children.map(child => (
              <div key={child.id} className="flex items-center justify-between bg-brand-dark border border-brand-border rounded-xl px-4 py-3">
                <div>
                  <span className="font-medium text-white">{child.username}</span>
                  <span className="text-xs text-gray-400 ml-2">{child.country}</span>
                </div>
                <span className="text-brand-gold text-sm font-bold">{child.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
