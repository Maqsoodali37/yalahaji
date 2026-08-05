import { routing } from '@/i18n/routing'

/**
 * Single source of truth for SEO and social metadata.
 *
 * Anything that appears in a <meta> tag, a share preview, or structured data
 * lives here rather than being inlined in a page — so a copy change is one
 * edit, not a hunt through the app directory.
 */

export type Locale = (typeof routing.locales)[number]

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')

/** Digits only — wa.me rejects '+' and spaces. */
export const WHATSAPP_NUMBER = (
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '+923103087086'
).replace(/[^\d]/g, '')

/** E.164, for tel: links and structured data. */
export const PHONE_E164 = `+${WHATSAPP_NUMBER}`

/** Human-readable, e.g. '+92 310 3087086'. Falls back to E.164 if unparseable. */
export const WHATSAPP_DISPLAY = /^92\d{10}$/.test(WHATSAPP_NUMBER)
  ? `+${WHATSAPP_NUMBER.slice(0, 2)} ${WHATSAPP_NUMBER.slice(2, 5)} ${WHATSAPP_NUMBER.slice(5)}`
  : PHONE_E164

export const SITE_NAME = 'Yala Haji'

export const SOCIAL = {
  facebook: 'https://facebook.com/yalahaji',
  instagram: 'https://instagram.com/yalahaji',
  youtube: 'https://youtube.com/@yalahaji',
  whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
} as const

/** Facebook Page URL — emitted as og:see_also and article:publisher. */
export const FACEBOOK_PAGE = SOCIAL.facebook

/**
 * Optional. Set NEXT_PUBLIC_FACEBOOK_APP_ID to enable Facebook Insights on
 * shares; omitted from the head entirely when unset.
 */
export const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || undefined

// ─── Per-locale copy ──────────────────────────────────────────────────────────

export const TITLES: Record<Locale, string> = {
  en: 'Yala Haji — Hajj & Umrah Essentials in Pakistan',
  ur: 'یلا حاجی — حج و عمرہ کا مکمل سامان',
  ar: 'يلا حاجي — مستلزمات الحج والعمرة',
}

/**
 * Meta descriptions. Kept in the 140–160 character range so Google shows them
 * whole, front-loaded with what the shop sells and closing on the two things
 * Pakistani buyers filter on: cash on delivery and free shipping.
 */
export const DESCRIPTIONS: Record<Locale, string> = {
  en: 'Shop authentic Hajj & Umrah essentials in Pakistan — complete kits, ihram, abayas, attar and prayer accessories. Cash on Delivery, free shipping over ₨2,999.',
  ur: 'پاکستان میں حج و عمرہ کا اصل سامان خریدیں — مکمل کٹس، احرام، عبایا، عطر، تسبیح اور نماز کا سامان۔ کیش آن ڈیلیوری، ₨2,999 سے زائد پر مفت ڈیلیوری۔',
  ar: 'تسوق مستلزمات الحج والعمرة الأصلية في باكستان — أطقم كاملة، إحرام، عبايات، عطور، مسابح ومستلزمات الصلاة. الدفع عند الاستلام وشحن مجاني.',
}

/** Short variant for share cards, where long text is truncated anyway. */
export const SHARE_DESCRIPTIONS: Record<Locale, string> = {
  en: 'Complete Hajj & Umrah kits, ihram, abayas and attar — delivered across Pakistan with Cash on Delivery.',
  ur: 'مکمل حج و عمرہ کٹس، احرام، عبایا اور عطر — پورے پاکستان میں کیش آن ڈیلیوری کے ساتھ۔',
  ar: 'أطقم الحج والعمرة الكاملة، الإحرام، العبايات والعطور — توصيل في جميع أنحاء باكستان.',
}

/**
 * Keywords carry no ranking weight at Google, but Bing and several regional
 * engines still read them, and they cost nothing. Terms reflect how Pakistani
 * buyers actually search — transliterated Urdu alongside English.
 */
export const KEYWORDS: Record<Locale, string[]> = {
  en: [
    'Hajj essentials', 'Umrah essentials', 'Hajj kit', 'Umrah kit',
    'ihram', 'ihram cloth', 'ihram for men', 'abaya', 'hijab',
    'attar', 'oud attar', 'rose attar', 'tasbeeh', 'prayer mat', 'janamaz',
    'ajwa dates', 'zamzam', 'tabaruk gifts', 'thobe',
    'Hajj shopping Pakistan', 'Umrah shopping Pakistan',
    'Hajj kit price in Pakistan', 'online Umrah store',
    'cash on delivery', 'Yala Haji',
  ],
  ur: [
    'حج کا سامان', 'عمرہ کا سامان', 'حج کٹ', 'عمرہ کٹ',
    'احرام', 'احرام کپڑا', 'عبایا', 'حجاب',
    'عطر', 'عود عطر', 'تسبیح', 'جانماز',
    'عجوہ کھجور', 'زمزم', 'تبرک تحفے', 'ثوب',
    'پاکستان میں حج کا سامان', 'آن لائن عمرہ اسٹور',
    'کیش آن ڈیلیوری', 'یلا حاجی',
  ],
  ar: [
    'مستلزمات الحج', 'مستلزمات العمرة', 'طقم الحج', 'طقم العمرة',
    'إحرام', 'قماش الإحرام', 'عباية', 'حجاب',
    'عطر', 'عطر عود', 'مسبحة', 'سجادة صلاة',
    'تمر عجوة', 'زمزم', 'هدايا تبرك', 'ثوب',
    'متجر العمرة اون لاين', 'الدفع عند الاستلام', 'يلا حاجي',
  ],
}

/** og:locale wants the full BCP-47 territory form, not the bare language. */
export const OG_LOCALES: Record<Locale, string> = {
  en: 'en_PK',
  ur: 'ur_PK',
  ar: 'ar_SA',
}

export function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value)
}

/** Falls back to the default locale rather than throwing on an unknown value. */
export function asLocale(value: string): Locale {
  return isLocale(value) ? value : routing.defaultLocale
}

/** Absolute URL for a locale-prefixed path ('' for the home page). */
export function localeUrl(locale: string, path = ''): string {
  return `${SITE_URL}/${locale}${path}`
}

/**
 * hreflang map for a path, including x-default. Next renders these as
 * <link rel="alternate">, which is what tells Google the three locales are
 * translations rather than duplicate content.
 */
export function languageAlternates(path = ''): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const locale of routing.locales) {
    languages[locale] = localeUrl(locale, path)
  }
  languages['x-default'] = localeUrl(routing.defaultLocale, path)
  return languages
}
