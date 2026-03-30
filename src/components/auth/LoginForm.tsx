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
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Clear previous user's localStorage cache before signing in
    try {
      localStorage.removeItem('robojunior_avatar')
      localStorage.removeItem('robojunior_inventory')
    } catch { /* ignore */ }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/roles')
      router.refresh()
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    setResetError('')
    setResetMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + '/api/auth/callback?next=/reset-password',
    })

    if (error) {
      setResetError(error.message)
    } else {
      setResetMessage(t('resetEmailSent'))
    }
    setResetLoading(false)
  }

  if (showForgotPassword) {
    return (
      <form onSubmit={handleResetPassword} className="space-y-4">
        <p className="text-gray-300 text-sm">
          {t('resetEmailPrompt')}
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t('email')}
          </label>
          <input
            type="email"
            value={resetEmail}
            onChange={e => setResetEmail(e.target.value)}
            required
            className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-blue transition-colors"
            placeholder="you@example.com"
          />
        </div>

        {resetError && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {resetError}
          </p>
        )}

        {resetMessage && (
          <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
            {resetMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={resetLoading}
          className="w-full bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 sm:py-3 rounded-xl transition-colors"
        >
          {resetLoading ? '...' : t('sendResetLink')}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowForgotPassword(false)
            setResetError('')
            setResetMessage('')
          }}
          className="w-full text-gray-400 hover:text-white text-sm transition-colors"
        >
          {t('backToLogin')}
        </button>
      </form>
    )
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
        className="w-full bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 sm:py-3 rounded-xl transition-colors"
      >
        {loading ? '...' : t('login')}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setShowForgotPassword(true)}
          className="text-brand-blue hover:underline text-sm py-2 px-2 inline-block"
        >
          {t('forgotPassword')}
        </button>
      </div>
    </form>
  )
}
