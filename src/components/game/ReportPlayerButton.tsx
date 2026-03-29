'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

const REPORT_REASONS = ['harassment', 'inappropriateName', 'cheating', 'other'] as const
type ReportReason = typeof REPORT_REASONS[number]

interface ReportPlayerButtonProps {
  reporterId: string
  reportedId: string
}

export default function ReportPlayerButton({ reporterId, reportedId }: ReportPlayerButtonProps) {
  const t = useTranslations('report')
  const supabaseRef = useRef(createClient())
  const [alreadyReported, setAlreadyReported] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Check if already reported
  useEffect(() => {
    const supabase = supabaseRef.current
    supabase
      .from('player_reports')
      .select('id')
      .eq('reporter_id', reporterId)
      .eq('reported_id', reportedId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAlreadyReported(true)
        setLoading(false)
      })
  }, [reporterId, reportedId])

  const handleSubmit = async () => {
    if (!selectedReason || submitting) return
    setSubmitting(true)
    const supabase = supabaseRef.current

    const { error } = await supabase.from('player_reports').insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      reason: selectedReason,
    })

    if (!error) {
      setSubmitted(true)
      setAlreadyReported(true)
      setTimeout(() => {
        setShowModal(false)
        setSubmitted(false)
      }, 1500)
    }
    setSubmitting(false)
  }

  if (loading) return null

  // Don't show for own profile
  if (reporterId === reportedId) return null

  return (
    <>
      <button
        onClick={() => !alreadyReported && setShowModal(true)}
        disabled={alreadyReported}
        className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
          alreadyReported
            ? 'text-gray-500 cursor-not-allowed'
            : 'text-red-400 hover:text-red-300 cursor-pointer'
        }`}
      >
        {/* Flag icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 2v12M3 2h8l-2 3 2 3H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {alreadyReported ? t('alreadyReported') : t('reportPlayer')}
      </button>

      {/* Report Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowModal(false)}>
          <div
            className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl p-4 sm:p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            {submitted ? (
              <div className="text-center py-4">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-3">
                  <circle cx="24" cy="24" r="20" fill="#22C55E" opacity="0.2"/>
                  <path d="M16 24l5 5 11-11" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-green-400 font-bold">{t('reportSubmitted')}</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-4">{t('reportPlayer')}</h3>
                <p className="text-gray-400 text-sm mb-4">{t('selectReason')}</p>

                <div className="space-y-2 mb-6">
                  {REPORT_REASONS.map(reason => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                        selectedReason === reason
                          ? 'bg-red-900/30 border border-red-500/50 text-red-300'
                          : 'bg-[var(--brand-dark)] border border-[var(--brand-border)] text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {t(`reasons.${reason}`)}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 text-gray-400 border border-[var(--brand-border)] rounded-xl text-sm hover:text-white transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedReason || submitting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? '...' : t('submit')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
