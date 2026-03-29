'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { IconTrophy, IconHandshake, IconTarget, IconGlobe, IconCity, IconFarm, IconRocket } from '@/components/ui/SvgIcon'

const BENEFITS: { icon: ReactNode; titleKey: string; descKey: string; color: string }[] = [
  { icon: <IconTrophy size={28} />, titleKey: 'b1Title', descKey: 'b1Desc', color: 'border-yellow-500/30 bg-yellow-900/10' },
  { icon: <IconHandshake size={28} />, titleKey: 'b2Title', descKey: 'b2Desc', color: 'border-blue-500/30 bg-blue-900/10' },
  { icon: <IconTarget size={28} />, titleKey: 'b3Title', descKey: 'b3Desc', color: 'border-purple-500/30 bg-purple-900/10' },
  { icon: <IconGlobe size={28} />, titleKey: 'b4Title', descKey: 'b4Desc', color: 'border-green-500/30 bg-green-900/10' },
]

const STEPS = [
  { num: '1', titleKey: 's1Title', descKey: 's1Desc' },
  { num: '2', titleKey: 's2Title', descKey: 's2Desc' },
  { num: '3', titleKey: 's3Title', descKey: 's3Desc' },
]

const MISSIONS: { icon: ReactNode; labelKey: string; rolesKey: string; descKey: string; gradient: string; border: string }[] = [
  {
    icon: <IconCity size={36} />,
    labelKey: 'templates.city_infrastructure',
    rolesKey: 'cityRoles',
    descKey: 'cityDesc',
    gradient: 'from-blue-900/30 to-cyan-900/20',
    border: 'border-blue-500/20',
  },
  {
    icon: <IconFarm size={36} />,
    labelKey: 'templates.smart_farm',
    rolesKey: 'farmRoles',
    descKey: 'farmDesc',
    gradient: 'from-green-900/30 to-emerald-900/20',
    border: 'border-green-500/20',
  },
  {
    icon: <IconRocket size={36} animated />,
    labelKey: 'templates.startup_launch',
    rolesKey: 'startupRoles',
    descKey: 'startupDesc',
    gradient: 'from-purple-900/30 to-pink-900/20',
    border: 'border-purple-500/20',
  },
]

export default function CoopInfo() {
  const t = useTranslations('coop')
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-[var(--brand-panel)] border border-[var(--brand-border)] rounded-2xl overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <IconHandshake size={28} />
          <div className="text-left">
            <p className="font-black text-white text-lg leading-tight">{t('infoTitle')}</p>
            <p className="text-gray-400 text-sm">{t('infoSubtitle')}</p>
          </div>
        </div>
        <span className="text-gray-400 text-lg transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▾
        </span>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6 border-t border-[var(--brand-border)]">

          {/* Benefits */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5">
            {BENEFITS.map(b => (
              <div key={b.titleKey} className={`rounded-xl border p-4 ${b.color}`}>
                <div className="mb-2">{b.icon}</div>
                <p className="font-black text-white text-sm leading-snug">{t(b.titleKey)}</p>
                <p className="text-gray-400 text-xs mt-1 leading-snug">{t(b.descKey)}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t('howTitle')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {STEPS.map((step, i) => (
                <div key={step.num} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--brand-blue)]/20 border border-[var(--brand-blue)]/40 flex items-center justify-center text-[var(--brand-blue)] text-sm font-black">
                    {step.num}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{t(step.titleKey)}</p>
                    <p className="text-gray-400 text-xs mt-0.5 leading-snug">{t(step.descKey)}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mission types */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t('missionsTitle')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MISSIONS.map(m => (
                <div key={m.descKey} className={`rounded-xl border bg-gradient-to-br ${m.gradient} ${m.border} p-4`}>
                  <div className="mb-2">{m.icon}</div>
                  <p className="font-black text-white text-sm">{t(m.labelKey)}</p>
                  <p className="text-[var(--brand-blue)] text-xs font-medium mt-1">{t(m.rolesKey)}</p>
                  <p className="text-gray-400 text-xs mt-2 leading-snug">{t(m.descKey)}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
