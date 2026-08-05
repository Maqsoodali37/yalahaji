'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Cookie, X } from 'lucide-react'
import {
  isAnalyticsEnabled,
  readStoredConsent,
  setConsent,
  type ConsentChoice,
} from '@/lib/analytics'

/**
 * Consent Mode v2 banner.
 *
 * Google's tag is already on the page with consent defaulted to denied, so
 * this component does not gate script loading — it only sends the `consent
 * update` command. That is the arrangement Google documents: the tag can
 * still send cookieless pings while denied, which preserves modelled
 * conversions instead of leaving a hole in the reports.
 *
 * Not rendered at all when analytics is disabled — there is nothing to consent
 * to, and a banner asking permission for a tag that does not exist is worse
 * than no banner.
 */
export function ConsentBanner() {
  const t = useTranslations('consent')
  const locale = useLocale()
  // Starts hidden and is only shown from an effect. Rendering it during SSR
  // would flash the banner for visitors who already decided, since the stored
  // choice lives in localStorage and is unreadable on the server.
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isAnalyticsEnabled) return
    if (readStoredConsent() === null) setVisible(true)
  }, [])

  if (!isAnalyticsEnabled || !visible) return null

  const decide = (choice: ConsentChoice) => {
    setConsent(choice)
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t('title')}
      // Sits above the WhatsApp bubble but below the cart drawer, and clears
      // the mobile bottom bar so it never covers the primary nav.
      className="fixed inset-x-0 bottom-0 z-[45] mb-16 md:mb-0 px-3 pb-3 md:px-6 md:pb-6 print:hidden"
    >
      <div className="container-max">
        <div className="relative bg-white border border-line rounded-md shadow-lg p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <span className="shrink-0 w-9 h-9 rounded-full bg-green-tint text-green flex items-center justify-center">
              <Cookie className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-ink text-sm">{t('title')}</p>
              <p className="text-sm text-muted mt-0.5">
                {t('description')}{' '}
                <Link
                  href={`/${locale}/terms`}
                  className="text-green underline underline-offset-2 hover:no-underline"
                >
                  {t('learnMore')}
                </Link>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ps-12 md:ps-0">
            <button
              type="button"
              onClick={() => decide('denied')}
              className="btn-outline flex-1 md:flex-none text-sm"
            >
              {t('decline')}
            </button>
            <button
              type="button"
              onClick={() => decide('granted')}
              className="btn-primary flex-1 md:flex-none text-sm"
            >
              {t('accept')}
            </button>
          </div>

          {/*
            Dismissing without choosing must not be read as consent — it leaves
            the default (denied) in place and simply hides the banner for this
            page view, so the visitor is asked again next time.
          */}
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label={t('dismiss')}
            className="absolute top-2 end-2 md:static p-1 text-muted hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
