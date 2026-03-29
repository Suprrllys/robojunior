import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function PrivacyPage() {
  const t = await getTranslations('legal')

  const sections = [
    { title: t('privacy.collectTitle'), content: t('privacy.collectContent') },
    { title: t('privacy.useTitle'), content: t('privacy.useContent') },
    { title: t('privacy.storageTitle'), content: t('privacy.storageContent') },
    { title: t('privacy.childrenTitle'), content: t('privacy.childrenContent') },
    { title: t('privacy.parentalTitle'), content: t('privacy.parentalContent') },
    { title: t('privacy.sharingTitle'), content: t('privacy.sharingContent') },
    { title: t('privacy.cookiesTitle'), content: t('privacy.cookiesContent') },
    { title: t('privacy.retentionTitle'), content: t('privacy.retentionContent') },
    { title: t('privacy.deletionTitle'), content: t('privacy.deletionContent') },
    { title: t('privacy.contactTitle'), content: t('privacy.contactContent') },
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
        <h1 className="text-3xl font-black text-white mt-4">{t('privacy.title')}</h1>
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
