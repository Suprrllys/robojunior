'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function CertificatePage() {
  const t = useTranslations('certificate')
  const tCommon = useTranslations('common')
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20 border-2 border-yellow-500/40">
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="4" width="32" height="36" rx="4" fill="#F59E0B" opacity="0.3" stroke="#F59E0B" strokeWidth="1.5"/>
            <line x1="16" y1="14" x2="32" y2="14" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
            <line x1="16" y1="20" x2="32" y2="20" stroke="#F59E0B" strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
            <line x1="16" y1="25" x2="28" y2="25" stroke="#F59E0B" strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
            <circle cx="24" cy="35" r="5" fill="#F59E0B" opacity="0.4" stroke="#F59E0B" strokeWidth="1"/>
            <path d="M22 35l1.5 1.5 3-3" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-3xl font-black text-white">{t('pageTitle')}</h1>
        <p className="text-gray-400">{t('pageSubtitle')}</p>
      </div>

      {/* What is the certificate */}
      <div className="bg-brand-panel border border-yellow-500/30 rounded-2xl p-6 space-y-3">
        <h2 className="text-lg font-bold text-white">{t('whatIsTitle')}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{t('whatIsDesc')}</p>
      </div>

      {/* Benefits */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">{t('benefitsTitle')}</h2>
        <ul className="space-y-3">
          {(['portfolio', 'social', 'competitions', 'employers'] as const).map((key) => (
            <li key={key} className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <span className="text-gray-300">{t(`benefits.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* How to get it */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 space-y-3">
        <h2 className="text-lg font-bold text-white">{t('howToGetTitle')}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{t('howToGetDesc')}</p>
      </div>

      {/* Get certificate button */}
      <div className="text-center">
        <button
          onClick={() => setShowModal(true)}
          className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl transition-colors"
        >
          {t('getButton')}
        </button>
      </div>

      {/* Back to profile */}
      <div className="text-center">
        <Link href="/profile" className="text-[var(--brand-blue)] hover:underline text-sm">
          {t('backToProfile')}
        </Link>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 max-w-md w-full space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-500/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
            <p className="text-gray-300">{tCommon('comingSoonMessage')}</p>
            <button
              onClick={() => setShowModal(false)}
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
