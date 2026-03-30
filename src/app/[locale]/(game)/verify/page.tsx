'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function VerifyPage() {
  const t = useTranslations('verify')
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        {/* Shield icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-blue/20 border-2 border-brand-blue/40">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-blue">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-white">{t('title')}</h1>
        <p className="text-gray-400">{t('subtitle')}</p>
      </div>

      {/* Benefits */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">{t('benefitsTitle')}</h2>
        <ul className="space-y-3">
          {(['badge', 'partnerMatching', 'genderMatching', 'coopPriority', 'trust'] as const).map((key) => (
            <li key={key} className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <span className="text-gray-300">{t(`benefits.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* What's needed */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 space-y-3">
        <h2 className="text-lg font-bold text-white">{t('requirementsTitle')}</h2>
        <p className="text-gray-400">{t('requirementsDescription')}</p>
      </div>

      {/* Disabled Verify button */}
      <div className="text-center">
        <button
          onClick={() => setShowModal(true)}
          className="px-8 py-3 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
        >
          {t('verifyNow')}
        </button>
      </div>

      {/* Back to profile */}
      <div className="text-center">
        <Link href="/profile" className="text-brand-blue hover:underline text-sm">
          {t('backToProfile')}
        </Link>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 max-w-md w-full space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-blue/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-blue">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
            <p className="text-gray-300">{t('modalMessage')}</p>
            <button
              onClick={() => setShowModal(false)}
              className="px-6 py-2 bg-brand-blue text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              {t('modalClose')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
