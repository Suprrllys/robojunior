import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function TermsPage() {
  const t = await getTranslations('legal')

  const sections = [
    { title: t('tos.serviceTitle'), content: t('tos.serviceContent') },
    { title: t('tos.ageTitle'), content: t('tos.ageContent') },
    { title: t('tos.accountTitle'), content: t('tos.accountContent') },
    { title: t('tos.behaviorTitle'), content: t('tos.behaviorContent') },
    { title: t('tos.currencyTitle'), content: t('tos.currencyContent') },
    { title: t('tos.coopTitle'), content: t('tos.coopContent') },
    { title: t('tos.ipTitle'), content: t('tos.ipContent') },
    { title: t('tos.terminationTitle'), content: t('tos.terminationContent') },
    { title: t('tos.disclaimerTitle'), content: t('tos.disclaimerContent') },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/profile"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          &larr; {t('backToProfile')}
        </Link>
        <h1 className="text-3xl font-black text-white mt-4">{t('tos.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('lastUpdated')}: 2026-03-29</p>
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 space-y-6">
        {sections.map((section, i) => (
          <div key={i}>
            <h2 className="text-lg font-bold text-white mb-2">
              {i + 1}. {section.title}
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 text-center pb-8">
        {t('questionsContact')}: robojunior@example.com
      </p>
    </div>
  )
}
