import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import '../globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'RoboJunior — Career Simulator',
  description: 'Try engineering careers before choosing your path. Built for BRICS+ youth.',
  keywords: 'robotics, career, education, BRICS, Saudi Arabia, engineering',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as 'en' | 'ru' | 'ar')) {
    notFound()
  }

  const messages = await getMessages()
  const isRtl = locale === 'ar'

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
      <body className={`${inter.className} bg-brand-dark text-white min-h-screen`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
