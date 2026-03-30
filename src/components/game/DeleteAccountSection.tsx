'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { deleteAccount } from '@/lib/game/delete-account'

export default function DeleteAccountSection({ isDemo }: { isDemo?: boolean }) {
  const t = useTranslations('profile')
  const locale = useLocale()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (isDemo) return null

  return (
    <>
      <div className="border border-red-800/50 bg-red-950/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 flex-shrink-0">
          <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-red-400">{t('deleteAccount.title')}</h2>
          <p className="text-red-300/70 text-xs mt-0.5">{t('deleteAccount.warning')}</p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={deleting}
          className="w-full sm:w-auto px-5 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors whitespace-nowrap flex-shrink-0"
        >
          {deleting ? '...' : t('deleteAccount.button')}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[var(--brand-panel)] border border-red-800/50 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-red-400 font-bold">{t('deleteAccount.confirmTitle')}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{t('deleteAccount.confirmMessage')}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold rounded-xl transition-colors"
              >
                {t('deleteAccount.cancelButton')}
              </button>
              <button
                onClick={async () => {
                  setDeleting(true)
                  const result = await deleteAccount()
                  if (result.success) {
                    window.location.href = `/${locale}/register`
                  } else {
                    setDeleting(false)
                    setShowConfirm(false)
                    alert(result.error || 'Something went wrong')
                  }
                }}
                disabled={deleting}
                className="px-5 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
              >
                {deleting ? '...' : t('deleteAccount.confirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
