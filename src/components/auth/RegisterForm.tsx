'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Country } from '@/types/database'

const COUNTRIES: { value: Country; flag: string }[] = [
  { value: 'SA', flag: '🇸🇦' },
  { value: 'RU', flag: '🇷🇺' },
  { value: 'IN', flag: '🇮🇳' },
  { value: 'CN', flag: '🇨🇳' },
  { value: 'BR', flag: '🇧🇷' },
  { value: 'OTHER', flag: '🌍' },
]

export default function RegisterForm() {
  const t = useTranslations('auth')
  const tCountries = useTranslations('countries')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    country: 'SA' as Country,
    age: 16,
    isParent: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field: string, value: string | number | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (form.age < 13 || form.age > 99) {
      setError('Age must be between 13 and 99')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          username: form.username,
          country: form.country,
          age: form.age,
          is_parent: form.isParent,
          preferred_language: locale,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/roles')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {t('username')}
        </label>
        <input
          type="text"
          value={form.username}
          onChange={e => update('username', e.target.value)}
          required
          minLength={3}
          maxLength={30}
          className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-blue transition-colors"
          placeholder="engineer_kamar"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {t('email')}
        </label>
        <input
          type="email"
          value={form.email}
          onChange={e => update('email', e.target.value)}
          required
          className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-blue transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t('country')}
          </label>
          <select
            value={form.country}
            onChange={e => update('country', e.target.value)}
            className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-blue transition-colors"
          >
            {COUNTRIES.map(c => (
              <option key={c.value} value={c.value}>
                {c.flag} {tCountries(c.value)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t('age')}
          </label>
          <input
            type="number"
            value={form.age}
            onChange={e => update('age', parseInt(e.target.value))}
            min={13}
            max={99}
            required
            className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-blue transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {t('password')}
        </label>
        <input
          type="password"
          value={form.password}
          onChange={e => update('password', e.target.value)}
          required
          minLength={8}
          className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-blue transition-colors"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {t('confirmPassword')}
        </label>
        <input
          type="password"
          value={form.confirmPassword}
          onChange={e => update('confirmPassword', e.target.value)}
          required
          className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-blue transition-colors"
          placeholder="••••••••"
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isParent}
          onChange={e => update('isParent', e.target.checked)}
          className="w-4 h-4 accent-brand-blue"
        />
        <span className="text-sm text-gray-300">{t('parentAccount')}</span>
      </label>

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
      >
        {loading ? '...' : t('register')}
      </button>
    </form>
  )
}
