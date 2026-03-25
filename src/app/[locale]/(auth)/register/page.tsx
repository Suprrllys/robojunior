import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  const t = useTranslations('auth')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
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
        </div>
      </div>
    </div>
  )
}
