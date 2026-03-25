import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  const t = useTranslations('auth')

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black">
            <span className="text-white">Robo</span>
            <span className="text-brand-blue">Junior</span>
          </Link>
          <p className="text-gray-400 mt-2">{t('loginTitle')}</p>
        </div>

        {/* Form */}
        <div className="bg-brand-panel border border-brand-border rounded-2xl p-8">
          <LoginForm />

          <p className="text-center text-gray-400 text-sm mt-6">
            {t('dontHaveAccount')}{' '}
            <Link href="/register" className="text-brand-blue hover:underline font-medium">
              {t('register')}
            </Link>
          </p>
        </div>

        {/* Demo link */}
        <div className="text-center mt-4">
          <Link
            href="/demo"
            className="text-brand-gold hover:underline text-sm"
          >
            ⚡ {t('demo')} — {t('demoSubtitle')}
          </Link>
        </div>
      </div>
    </div>
  )
}
