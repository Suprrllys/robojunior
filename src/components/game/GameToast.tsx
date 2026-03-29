'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'

interface ToastData {
  xp: number
  score: number
  badge?: string
}

export function fireGameToast(data: ToastData) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game-toast', { detail: data }))
  }
}

export default function GameToast() {
  const locale = useLocale()
  const [toast, setToast] = useState<ToastData | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleToast(e: Event) {
      const data = (e as CustomEvent<ToastData>).detail
      setToast(data)
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 3500)
      return () => clearTimeout(timer)
    }

    window.addEventListener('game-toast', handleToast)
    return () => window.removeEventListener('game-toast', handleToast)
  }, [])

  if (!toast) return null

  return (
    <div
      className={`fixed top-20 right-4 z-50 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-brand-panel border border-brand-gold/50 rounded-2xl px-6 py-4 shadow-2xl shadow-brand-gold/10 min-w-52">
        <div className="flex items-center gap-3">
          <div className="text-3xl animate-bounce">🎉</div>
          <div>
            <p className="text-white font-black text-lg">{locale === 'ru' ? 'Миссия выполнена!' : locale === 'ar' ? 'اكتملت المهمة!' : 'Mission Complete!'}</p>
            <p className="text-brand-gold font-bold">+{toast.xp} XP · {locale === 'ru' ? 'Счёт' : locale === 'ar' ? 'النتيجة' : 'Score'}: {toast.score}</p>
          </div>
        </div>
        {toast.badge && (
          <div className="mt-3 pt-3 border-t border-brand-border flex items-center gap-2">
            <span className="text-xl">🏅</span>
            <p className="text-yellow-300 text-sm font-medium">{locale === 'ru' ? 'Новый значок' : locale === 'ar' ? 'شارة جديدة' : 'New badge'}: {toast.badge}</p>
          </div>
        )}
      </div>
    </div>
  )
}
