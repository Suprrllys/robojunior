import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'ru', 'ar'],
  defaultLocale: 'ru',
  localePrefix: 'as-needed',
})
