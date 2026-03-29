'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { isUsernameClean } from '@/lib/game/username-filter'
import type { Country } from '@/types/database'

const COUNTRY_LOCALE: Record<Country, string> = {
  SA: 'ar',
  RU: 'ru',
  IN: 'en',
  CN: 'en',
  BR: 'en',
  OTHER: 'en',
}

const COUNTRIES: { value: Country; flagCode: string | null }[] = [
  { value: 'SA', flagCode: 'sa' },
  { value: 'RU', flagCode: 'ru' },
  { value: 'IN', flagCode: 'in' },
  { value: 'CN', flagCode: 'cn' },
  { value: 'BR', flagCode: 'br' },
  { value: 'OTHER', flagCode: null },
]

function CountryFlag({ code, size = 20 }: { code: string | null; size?: number }) {
  if (!code) return <span style={{ fontSize: size * 0.7 }}>🌍</span>
  return (
    <Image
      src={`https://flagcdn.com/w40/${code}.png`}
      alt=""
      width={size}
      height={Math.round(size * 0.7)}
      className="rounded-sm object-cover"
      unoptimized
    />
  )
}

function getAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export default function RegisterForm() {
  const t = useTranslations('auth')
  const tCountries = useTranslations('countries')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    country: 'SA' as Country,
    birthDate: '',
    isParent: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const countryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!countryOpen) return
    function handleClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [countryOpen])

  function update(field: string, value: string | number | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.username.trim() || form.username.trim().length < 2) {
      setError(t('usernameTooShort'))
      return
    }

    if (!isUsernameClean(form.username)) {
      setError(t('usernameInappropriate'))
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!form.birthDate) {
      setError(t('birthDateRequired'))
      return
    }

    const age = getAge(form.birthDate)
    if (age < 13 || age > 99) {
      setError(t('ageError'))
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
          age,
          is_parent: form.isParent,
          preferred_language: COUNTRY_LOCALE[form.country] || locale,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t('country')}
          </label>
          <div className="relative" ref={countryRef}>
            <button
              type="button"
              onClick={() => setCountryOpen(v => !v)}
              className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-blue transition-colors flex items-center gap-2.5 text-left"
            >
              <CountryFlag code={COUNTRIES.find(c => c.value === form.country)?.flagCode ?? null} />
              <span className="flex-1 truncate">{tCountries(form.country)}</span>
              <span className="text-gray-500 text-xs">▾</span>
            </button>
            {countryOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-brand-panel border border-brand-border rounded-lg overflow-hidden shadow-xl z-50 max-h-48 overflow-y-auto">
                {COUNTRIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onMouseDown={() => {
                      update('country', c.value)
                      setCountryOpen(false)
                      const targetLocale = COUNTRY_LOCALE[c.value]
                      if (targetLocale && targetLocale !== locale) {
                        router.replace(pathname, { locale: targetLocale })
                      }
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                      form.country === c.value
                        ? 'bg-brand-blue/20 text-white'
                        : 'text-gray-300 hover:bg-brand-border'
                    }`}
                  >
                    <CountryFlag code={c.flagCode} />
                    <span className="text-sm">{tCountries(c.value)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t('birthDate')}
          </label>
          <input
            type="date"
            lang={locale}
            value={form.birthDate}
            onChange={e => update('birthDate', e.target.value)}
            max={new Date(new Date().getFullYear() - 13, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
            min="1930-01-01"
            required
            className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-blue transition-colors [color-scheme:dark]"
          />
          <p className="text-xs text-gray-500 mt-1">{t('birthDateHint')}</p>
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
          className="w-5 h-5 accent-brand-blue"
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
        className="w-full bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 sm:py-3 rounded-xl transition-colors"
      >
        {loading ? '...' : t('register')}
      </button>
    </form>
  )
}
