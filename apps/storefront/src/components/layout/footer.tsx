'use client'

import { useTranslations } from 'next-intl'
import { Phone, Mail, MapPin, MessageCircle, Instagram, Facebook, Youtube } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { SafeImage } from '@/components/ui/safe-image'
import { SOCIAL, WHATSAPP_DISPLAY } from '@/lib/seo'
import {
  ENABLED_PAYMENT_OPTIONS,
  COMING_SOON_PAYMENT_OPTIONS,
} from '@/lib/payment-methods'
import { FooterNav, FooterBottomLinks } from '@/components/navigation/footer-nav'

export function Footer() {
  const t = useTranslations('footer')
  const year = new Date().getFullYear()

  // The cart store already holds shop configuration and loads it once at
  // bootstrap, so this reuses that rather than adding a second fetch.
  const storePhone = useCartStore((s) => s.settings.storePhone)
  const storeEmail = useCartStore((s) => s.settings.storeEmail)

  return (
    // Approved design: light paper background, border-top — NOT dark green
    <footer className="bg-paper border-t border-line mt-16 pb-16 md:pb-0">
      {/* Main footer columns */}
      <div className="container-max">
        {/*
          `auto-fit`, not a fixed `md:grid-cols-5`. The middle columns come
          from the footer menu now, so their count is whatever an admin
          configured — a fixed five leaves a hole at four and wraps the
          contact block at six. The 110px track floor is what keeps five
          columns on one row at the narrowest `md` width (720px of content
          after padding, less three 36px gutters); 140px wrapped at four.
        */}
        <div className="grid grid-cols-2 md:grid-cols-[minmax(0,1.2fr)_repeat(auto-fit,minmax(110px,1fr))] gap-9 py-14">
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
                { href: SOCIAL.instagram, icon: Instagram, label: 'Instagram' },
                { href: SOCIAL.facebook, icon: Facebook, label: 'Facebook' },
                { href: SOCIAL.youtube, icon: Youtube, label: 'YouTube' },
              ].map(({ href, icon: Icon, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} — Yala Haji`}
                  className="w-[34px] h-[34px] rounded-full border border-line bg-white flex items-center justify-center text-ink-2 hover:bg-ink hover:text-white hover:border-ink transition-colors"
                >
                  <Icon className="w-[15px] h-[15px]" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/*
            Quick Links, Categories and Support were three inline arrays here.
            They had drifted from the catalogue and from each other — "About
            Us" was in two of them, so the same href rendered twice on every
            page. All three now come from the `footer` menu.
          */}
          <FooterNav />

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
                <a href={SOCIAL.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-gold-deep transition-colors">
                  {WHATSAPP_DISPLAY}
                </a>
              </li>
              {/* Phone and email come from the `store_phone` / `store_email`
                  config rather than being hardcoded, so changing the shop's
                  contact details is an admin edit rather than a deploy. */}
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-gold-deep flex-shrink-0" />
                <a
                  href={`tel:${storePhone.replace(/\s/g, '')}`}
                  className="hover:text-gold-deep transition-colors"
                >
                  {storePhone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-gold-deep flex-shrink-0" />
                <a
                  href={`mailto:${storeEmail}`}
                  className="hover:text-gold-deep transition-colors"
                >
                  {storeEmail}
                </a>
              </li>
            </ul>

            {/* Payment methods — driven by the same list checkout reads, so
                the footer cannot advertise a method that cannot be selected.
                It previously listed all four, including Bank Transfer, which
                is not supported at all. */}
            <div className="mt-4">
              <p className="text-[11px] text-stone mb-2 font-semibold">Accepted Payments</p>
              <div className="flex gap-1.5 flex-wrap">
                {ENABLED_PAYMENT_OPTIONS.map((pm) => (
                  <span
                    key={pm.key}
                    className="text-[10px] font-bold bg-white border border-line text-ink-2 px-2 py-1 rounded"
                  >
                    {pm.label}
                  </span>
                ))}
                {COMING_SOON_PAYMENT_OPTIONS.map((pm) => (
                  <span
                    key={pm.key}
                    title="Coming soon"
                    className="text-[10px] font-bold bg-paper border border-line text-stone px-2 py-1 rounded"
                  >
                    {pm.label} · soon
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-line py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-[12.5px] text-stone">
          <p>{t('copyright', { year })}</p>
          <FooterBottomLinks />
        </div>
      </div>
    </footer>
  )
}
