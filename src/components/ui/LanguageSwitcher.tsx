'use client'

import { useState } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { clsx } from 'clsx'
import Image from 'next/image'

const LOCALES = [
  { code: 'en', label: 'EN', flagCode: 'gb' },
  { code: 'ru', label: 'RU', flagCode: 'ru' },
  { code: 'ar', label: 'AR', flagCode: 'sa' },
] as const

function Flag({ code, label }: { code: string; label: string }) {
  return (
    <Image
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={label}
      width={20}
      height={14}
      className="rounded-sm object-cover"
      unoptimized
    />
  )
}

export default function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const current = LOCALES.find(l => l.code === locale)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1.5 bg-brand-dark border border-brand-border rounded-lg px-2.5 py-1.5 transition-colors hover:border-brand-blue"
      >
        {current && <Flag code={current.flagCode} label={current.label} />}
        <span className="text-gray-500 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-brand-panel border border-brand-border rounded-lg overflow-hidden shadow-xl z-50">
          {LOCALES.map(loc => (
            <button
              key={loc.code}
              onMouseDown={() => {
                router.replace(pathname, { locale: loc.code })
                setOpen(false)
              }}
              className={clsx(
                'flex items-center justify-center px-4 py-2.5 transition-colors',
                locale === loc.code
                  ? 'bg-brand-blue/10'
                  : 'hover:bg-brand-border'
              )}
            >
              <Flag code={loc.flagCode} label={loc.label} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
