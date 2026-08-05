import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Providers } from '@/components/providers'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CartDrawer } from '@/components/layout/cart-drawer'
import { WhatsAppBubble } from '@/components/layout/whatsapp-bubble'
import { MobileBottomBar } from '@/components/layout/mobile-bottom-bar'
import { CompareBar } from '@/components/layout/compare-bar'
import { RouteProgress } from '@/components/layout/route-progress'
import { OrganizationJsonLd } from '@/components/seo/json-ld'
import {
  SITE_URL,
  SITE_NAME,
  TITLES,
  DESCRIPTIONS,
  SHARE_DESCRIPTIONS,
  KEYWORDS,
  OG_LOCALES,
  FACEBOOK_PAGE,
  FACEBOOK_APP_ID,
  asLocale,
  localeUrl,
  languageAlternates,
} from '@/lib/seo'
import '@/app/globals.css'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = asLocale(raw)

  return {
    // Makes every relative URL below resolve to an absolute one. Without it
    // Facebook and WhatsApp receive a relative og:image and drop the preview.
    metadataBase: new URL(SITE_URL),

    title: {
      default: TITLES[locale],
      template: `%s | ${SITE_NAME}`,
    },
    description: DESCRIPTIONS[locale],
    keywords: KEYWORDS[locale],

    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: 'shopping',

    alternates: {
      canonical: localeUrl(locale),
      languages: languageAlternates(),
    },

    // ── Favicon / app icons ───────────────────────────────────────────────
    // icon.png, apple-icon.png and favicon.ico in src/app/ are picked up
    // automatically; this block adds the PWA manifest reference.
    manifest: '/manifest.webmanifest',

    // ── Facebook · WhatsApp · LinkedIn ────────────────────────────────────
    // WhatsApp link previews read Open Graph, not Twitter cards, and require
    // an absolute og:image under ~300KB to render the thumbnail.
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: TITLES[locale],
      description: SHARE_DESCRIPTIONS[locale],
      url: localeUrl(locale),
      locale: OG_LOCALES[locale],
      alternateLocale: Object.values(OG_LOCALES).filter(
        (l) => l !== OG_LOCALES[locale],
      ),
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${SHARE_DESCRIPTIONS[locale]}`,
          type: 'image/png',
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',
      title: TITLES[locale],
      description: SHARE_DESCRIPTIONS[locale],
      images: ['/og-image.png'],
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },

    other: {
      // og:see_also links the Facebook Page to the site for Facebook's crawler.
      'og:see_also': FACEBOOK_PAGE,
      ...(FACEBOOK_APP_ID ? { 'fb:app_id': FACEBOOK_APP_ID } : {}),
    },
  }
}

export const viewport: Viewport = {
  themeColor: '#0B5138',
  width: 'device-width',
  initialScale: 1,
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!routing.locales.includes(locale as 'en' | 'ur' | 'ar')) {
    notFound()
  }

  const messages = await getMessages()
  const dir = locale === 'ar' || locale === 'ur' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <OrganizationJsonLd locale={locale} />
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <RouteProgress />
            <Header />
            <main id="main-content" className="min-h-screen">
              {children}
            </main>
            <Footer />
            <CartDrawer />
            <CompareBar />
            <WhatsAppBubble />
            <MobileBottomBar />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
