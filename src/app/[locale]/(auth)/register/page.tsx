import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import RegisterForm from '@/components/auth/RegisterForm'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

export default function RegisterPage() {
  const t = useTranslations('auth')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Language switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black">
            <span className="text-white">Robo</span>
            <span className="text-brand-blue">Junior</span>
          </Link>
          <h1 className="text-xl font-bold text-white mt-2">{t('registerTitle')}</h1>
          <p className="text-gray-400 text-sm mt-1">{t('registerSubtitle')}</p>
        </div>

        <div className="bg-brand-panel border border-brand-border rounded-2xl p-8">
          <RegisterForm />

          <p className="text-center text-gray-400 text-sm mt-6">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-brand-blue hover:underline font-medium">
              {t('login')}
            </Link>
          </p>

          <div className="mt-4 pt-4 border-t border-brand-border text-center">
            <p className="text-gray-500 text-xs mb-3">{t('demoSubtitle')}</p>
            <Link
              href="/demo"
              className="inline-block w-full py-2.5 rounded-xl border border-brand-border text-gray-300 text-sm font-bold hover:border-brand-blue hover:text-brand-blue transition-colors"
            >
              🎮 {t('demo')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
