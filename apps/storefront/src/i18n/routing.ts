import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'ur', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: true,
})
