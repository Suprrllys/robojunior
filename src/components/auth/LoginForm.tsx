'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

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
          {t('email')}
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-blue transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {t('password')}
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-blue transition-colors"
          placeholder="••••••••"
        />
      </div>

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
        {loading ? '...' : t('login')}
      </button>
    </form>
  )
}
