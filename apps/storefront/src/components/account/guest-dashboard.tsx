'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { PackageSearch, LogIn, UserPlus, ShoppingBag, Heart, MapPin, RotateCcw } from 'lucide-react'

/**
 * What a signed-out visitor sees at `/account`.
 *
 * This replaces a sidebar that read "Guest User / guest@yalahaji.com" over an
 * avatar and a Sign Out button — a fabricated identity and an email address
 * that does not exist, for someone who was never signed in. That is the
 * pattern the project's honesty rule exists to stop, and it had the practical
 * cost of making a guest think they had an account whose password they had
 * forgotten.
 *
 * The primary action is tracking, not signing in: someone who lands here after
 * a guest checkout wants to know where their parcel is, and no account will
 * ever tell them — their order is not attached to one.
 */
export function GuestDashboard() {
  const locale = useLocale()
  const t = useTranslations('guest')

  const benefits = [
    { icon: ShoppingBag, text: t('benefitOrders') },
    { icon: Heart, text: t('benefitWishlist') },
    { icon: MapPin, text: t('benefitAddresses') },
    { icon: RotateCcw, text: t('benefitReturns') },
  ]

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white border border-line rounded-md p-6 sm:p-8 text-center">
        <div className="w-14 h-14 bg-green-tint rounded-full flex items-center justify-center mx-auto mb-4">
          <PackageSearch className="w-7 h-7 text-green" />
        </div>

        <h1 className="serif text-2xl text-ink mb-2">{t('title')}</h1>
        <p className="text-stone mb-1">{t('message')}</p>
        <p className="text-sm text-stone mb-6">{t('explain')}</p>

        <div className="flex flex-col gap-3">
          <Link href={`/${locale}/track-order`} className="btn-primary w-full">
            <span className="flex items-center justify-center gap-2">
              <PackageSearch className="w-4 h-4" />
              {t('trackCta')}
            </span>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link href={`/${locale}/login`} className="btn-outline">
              <span className="flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" />
                {t('signInCta')}
              </span>
            </Link>
            <Link href={`/${locale}/register`} className="btn-outline">
              <span className="flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" />
                {t('registerCta')}
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white border border-line rounded-md p-6 mt-4">
        <h2 className="font-semibold text-ink mb-4">{t('benefitsTitle')}</h2>
        <ul className="space-y-3">
          {benefits.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-green-tint flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-green" />
              </span>
              <span className="text-sm text-stone pt-1.5">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
