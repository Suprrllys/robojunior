import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import RobotAvatar from '@/components/game/RobotAvatar'

export default function HomePage() {
  const t = useTranslations()

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20 pointer-events-none" />

        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-blue opacity-10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex gap-4">
              <div className="float" style={{ animationDelay: '0s' }}>
                <RobotAvatar role="drone_programmer" color="#1E90FF" size={80} />
              </div>
              <div className="float" style={{ animationDelay: '0.5s' }}>
                <RobotAvatar role="robot_constructor" color="#10B981" size={80} />
              </div>
              <div className="float" style={{ animationDelay: '1s' }}>
                <RobotAvatar role="entrepreneur" color="#FFD700" size={80} />
              </div>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight">
            <span className="text-white">Robo</span>
            <span className="text-brand-blue">Junior</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-4 font-medium">
            {t('common.tagline')}
          </p>

          <p className="text-gray-400 mb-10 max-w-xl mx-auto">
            Try being a drone programmer, robot engineer, or tech entrepreneur —
            with peers from Saudi Arabia, Russia, and India.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-brand-blue hover:bg-blue-500 text-white font-bold rounded-xl text-lg transition-all glow-blue"
            >
              {t('auth.register')} →
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-brand-panel border border-brand-border hover:border-brand-blue text-white font-bold rounded-xl text-lg transition-all"
            >
              {t('auth.login')}
            </Link>
            <Link
              href="/demo"
              className="px-8 py-4 bg-transparent border border-brand-gold hover:bg-brand-gold hover:text-black text-brand-gold font-bold rounded-xl text-lg transition-all"
            >
              {t('auth.demo')} ⚡
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-brand-panel border-t border-brand-border py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon="🛸"
            title="3 Engineering Careers"
            description="Drone programming, robot construction, tech entrepreneurship — try them all"
          />
          <FeatureCard
            icon="🌍"
            title="BRICS+ Coop"
            description="Team up with players from Saudi Arabia, Russia, India — async, no timezone issues"
          />
          <FeatureCard
            icon="📊"
            title="Career Profile"
            description="After 3+ roles: your competency radar and top career recommendations"
          />
        </div>
      </div>

      {/* Language switcher */}
      <div className="border-t border-brand-border py-4 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center text-sm text-gray-500">
          <span>RoboJunior MVP · RobodexBRICS 2025/2026</span>
          <div className="flex gap-4">
            <Link href="/" locale="en" className="hover:text-white transition-colors">English</Link>
            <Link href="/" locale="ru" className="hover:text-white transition-colors">Русский</Link>
            <Link href="/" locale="ar" className="hover:text-white transition-colors">العربية</Link>
          </div>
        </div>
      </div>
    </main>
  )
}

function FeatureCard({ icon, title, description }: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="bg-brand-dark border border-brand-border rounded-xl p-6 hover:border-brand-blue transition-colors">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  )
}
