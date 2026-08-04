'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Phone, MapPin, MessageCircle, Instagram, Facebook, Youtube } from 'lucide-react'
import { SafeImage } from '@/components/ui/safe-image'

export function Footer() {
  const t = useTranslations('footer')
  const locale = useLocale()
  const year = new Date().getFullYear()

  return (
    // Approved design: light paper background, border-top — NOT dark green
    <footer className="bg-paper border-t border-line mt-16 pb-16 md:pb-0">
      {/* Main footer columns */}
      <div className="container-max">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-9 py-14">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3.5">
              <SafeImage
                src="/assets/logo.png"
                alt="Yala Haji — Your Journey, Our Care"
                className="h-[54px] w-auto object-contain"
              />
            </div>
            <p className="text-[13px] text-ink-2 max-w-[250px] mb-[18px]">{t('tagline')}</p>
            <div className="flex gap-2.5">
              {[
                { href: 'https://instagram.com/yalahaji', icon: Instagram },
                { href: 'https://facebook.com/yalahaji', icon: Facebook },
                { href: 'https://youtube.com/@yalahaji', icon: Youtube },
              ].map(({ href, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-[34px] h-[34px] rounded-full border border-line bg-white flex items-center justify-center text-ink-2 hover:bg-ink hover:text-white hover:border-ink transition-colors"
                >
                  <Icon className="w-[15px] h-[15px]" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="text-[11px] font-extrabold uppercase tracking-[.11em] text-stone mb-[15px]">
              {t('quickLinks')}
            </h5>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Track Order', href: '/account/orders' },
                { label: 'Kit Builder', href: '/kit-builder' },
                { label: 'Blog', href: '/blog' },
                { label: 'Sale', href: '/shop?filter=sale' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={`/${locale}${item.href}`}
                    className="text-[13.5px] text-ink-2 hover:text-gold-deep transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h5 className="text-[11px] font-extrabold uppercase tracking-[.11em] text-stone mb-[15px]">
              {t('categories')}
            </h5>
            <ul className="space-y-2.5">
              {[
                { label: 'Hajj & Umrah Kits', href: '/shop/kits' },
                { label: 'Ihram', href: '/shop/ihram' },
                { label: 'Abaya & Hijab', href: '/shop/abaya-hijab' },
                { label: 'Fragrances', href: '/shop/fragrances' },
                { label: 'Prayer Accessories', href: '/shop/prayer-accessories' },
                { label: 'Dates & Zam Zam', href: '/shop/dates-zamzam' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={`/${locale}${item.href}`}
                    className="text-[13.5px] text-ink-2 hover:text-gold-deep transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h5 className="text-[11px] font-extrabold uppercase tracking-[.11em] text-stone mb-[15px]">
              {t('support')}
            </h5>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Shipping Policy', href: '/shipping' },
                { label: 'Return Policy', href: '/returns' },
                { label: 'Terms & Conditions', href: '/terms' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={`/${locale}${item.href}`}
                    className="text-[13.5px] text-ink-2 hover:text-gold-deep transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="text-[11px] font-extrabold uppercase tracking-[.11em] text-stone mb-[15px]">
              {t('contact')}
            </h5>
            <ul className="space-y-2.5 text-[13px] text-ink-2">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-gold-deep flex-shrink-0 mt-0.5" />
                <span>{t('address')}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-gold-deep flex-shrink-0" />
                <a href="https://wa.me/923111234567" target="_blank" rel="noopener noreferrer" className="hover:text-gold-deep transition-colors">
                  +92 311 1234567
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-gold-deep flex-shrink-0" />
                <a href="tel:+923229876543" className="hover:text-gold-deep transition-colors">
                  +92 322 9876543
                </a>
              </li>
            </ul>

            {/* Payment methods */}
            <div className="mt-4">
              <p className="text-[11px] text-stone mb-2 font-semibold">Accepted Payments</p>
              <div className="flex gap-1.5 flex-wrap">
                {['JazzCash', 'Easypaisa', 'COD', 'Bank Transfer'].map((pm) => (
                  <span
                    key={pm}
                    className="text-[10px] font-bold bg-white border border-line text-ink-2 px-2 py-1 rounded"
                  >
                    {pm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-line py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-[12.5px] text-stone">
          <p>{t('copyright', { year })}</p>
          <div className="flex gap-4">
            <Link href={`/${locale}/terms`} className="hover:text-ink transition-colors">Terms</Link>
            <Link href={`/${locale}/returns`} className="hover:text-ink transition-colors">Returns</Link>
            <Link href={`/${locale}/shipping`} className="hover:text-ink transition-colors">Shipping</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
