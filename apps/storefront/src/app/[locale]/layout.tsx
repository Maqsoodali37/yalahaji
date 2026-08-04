import type { Metadata } from 'next'
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
import '@/app/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Yala Haji — Hajj & Umrah Essentials',
    template: '%s | Yala Haji',
  },
  description:
    'Premium Hajj & Umrah essentials — kits, ihram, attars, prayer accessories and more. Free shipping on orders over ₨2,999. Cash on Delivery available.',
  keywords: ['Hajj', 'Umrah', 'ihram', 'attar', 'prayer mat', 'Yala Haji', 'Pakistan'],
  openGraph: {
    title: 'Yala Haji — Hajj & Umrah Essentials',
    description: 'Premium Hajj & Umrah essentials trusted by thousands of pilgrims.',
    url: 'https://yalahaji.com',
    siteName: 'Yala Haji',
    locale: 'en_PK',
    type: 'website',
  },
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
