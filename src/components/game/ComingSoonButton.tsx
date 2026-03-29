'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface ComingSoonButtonProps {
  label: string
  className?: string
}

export default function ComingSoonButton({ label, className }: ComingSoonButtonProps) {
  const t = useTranslations('common')
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={className ?? 'px-6 py-2.5 bg-[var(--brand-blue)] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity'}
      >
        {label}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-6 max-w-sm w-full text-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <p className="text-white font-medium">{t('comingSoonMessage')}</p>
            <button
              onClick={() => setShowModal(false)}
              className="px-6 py-2.5 bg-[var(--brand-blue)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  )
}
