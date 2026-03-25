'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

const AVATAR_COLORS = [
  '#1E90FF', '#10B981', '#FFD700', '#EF4444', '#8B5CF6', '#F97316', '#EC4899', '#06B6D4',
]

const ACCESSORIES = ['none', 'antenna', 'hat', 'visor', 'wings', 'crown']

interface ProfileEditorProps {
  profile: {
    id: string
    username: string
    avatar_color: string
    avatar_accessory: string
    preferred_language: string
    gender_filter: string
    only_verified_partners: boolean
  }
}

export default function ProfileEditor({ profile }: ProfileEditorProps) {
  const t = useTranslations('profile')
  const supabase = createClient()
  const [form, setForm] = useState({
    username: profile.username,
    avatar_color: profile.avatar_color,
    avatar_accessory: profile.avatar_accessory,
    preferred_language: profile.preferred_language,
    gender_filter: profile.gender_filter,
    only_verified_partners: profile.only_verified_partners,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    await supabase.from('profiles').update(form).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 space-y-5">
      <h2 className="text-lg font-bold text-white">{t('editProfile')}</h2>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {t('color')}
        </label>
        <div className="flex gap-2 flex-wrap">
          {AVATAR_COLORS.map(color => (
            <button
              key={color}
              onClick={() => setForm(f => ({ ...f, avatar_color: color }))}
              className="w-8 h-8 rounded-lg border-2 transition-all"
              style={{
                backgroundColor: color,
                borderColor: form.avatar_color === color ? 'white' : 'transparent',
                transform: form.avatar_color === color ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {t('accessory')}
        </label>
        <div className="flex gap-2 flex-wrap">
          {ACCESSORIES.map(acc => (
            <button
              key={acc}
              onClick={() => setForm(f => ({ ...f, avatar_accessory: acc }))}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                form.avatar_accessory === acc
                  ? 'border-brand-blue bg-brand-blue/20 text-brand-blue'
                  : 'border-brand-border text-gray-400 hover:text-white'
              }`}
            >
              {t(`accessories.${acc}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {t('language')}
        </label>
        <select
          value={form.preferred_language}
          onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))}
          className="bg-brand-dark border border-brand-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
        >
          <option value="en">English</option>
          <option value="ru">Русский</option>
          <option value="ar">العربية</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t('genderFilter')}
        </label>
        <div className="flex gap-3">
          {['all', 'same'].map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender_filter"
                value={opt}
                checked={form.gender_filter === opt}
                onChange={e => setForm(f => ({ ...f, gender_filter: e.target.value }))}
                className="accent-brand-blue"
              />
              <span className="text-sm text-gray-300">
                {opt === 'all' ? t('genderFilterAll') : t('genderFilterSame')}
              </span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.only_verified_partners}
          onChange={e => setForm(f => ({ ...f, only_verified_partners: e.target.checked }))}
          className="w-4 h-4 accent-brand-blue"
        />
        <span className="text-sm text-gray-300">{t('verifiedOnly')}</span>
      </label>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
      >
        {saved ? '✓ Saved!' : saving ? '...' : t('../common.save', { defaultValue: 'Save' })}
      </button>
    </div>
  )
}
