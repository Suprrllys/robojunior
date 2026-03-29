import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

export default function ResetPasswordPage() {
  const t = useTranslations('auth')

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Language switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black">
            <span className="text-white">Robo</span>
            <span className="text-brand-blue">Junior</span>
          </Link>
          <p className="text-gray-400 mt-2">{t('updatePassword')}</p>
        </div>

        {/* Form */}
        <div className="bg-brand-panel border border-brand-border rounded-2xl p-8">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}
