'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

const DEMO_EMAIL = 'team13innovatika@mail.ru'
const DEMO_PASSWORD = 'RoboDemo2026!'

export default function DemoPage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    const supabase = createClient()
    supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .then(({ error }) => {
        if (error) {
          router.push('/register')
        } else {
          router.push('/roles')
          router.refresh()
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 float">⚡</div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('demoLoading')}</h2>
        <p className="text-gray-400">{t('demoEntering')}</p>
      </div>
    </div>
  )
}
