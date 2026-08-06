'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { RotateCw, Home, AlertTriangle } from 'lucide-react'

/**
 * Runtime error boundary for the locale tree — the *other* half of the 404
 * work. A missing product or category is not a crash: those call `notFound()`
 * and land on `not-found.tsx`. This page is for the genuine failures, an
 * unreachable API or a bug, and it says so rather than implying the thing the
 * customer asked for does not exist.
 *
 * `notFound()` throws a sentinel Next handles above this boundary, so it never
 * arrives here.
 *
 * Rendered inside `[locale]/layout.tsx`, so the header, footer and i18n
 * context are all present.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errorPage')
  const locale = useLocale()

  useEffect(() => {
    // The digest is all the customer can quote to support; the stack only
    // exists server-side. Logging here is what ties the two together.
    console.error('[storefront] unhandled render error', error)
  }, [error])

  return (
    <div className="bg-paper">
      <div className="container-max py-16 md:py-24">
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <AlertTriangle aria-hidden="true" className="h-6 w-6" />
          </span>

          <h1 className="serif mt-5 text-3xl md:text-4xl text-ink text-balance">
            {t('title')}
          </h1>

          <p className="mt-3 text-ink-2 leading-relaxed text-balance">{t('body')}</p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button type="button" onClick={reset} className="btn-primary">
              <RotateCw aria-hidden="true" className="h-4 w-4" />
              {t('retry')}
            </button>
            <Link href={`/${locale}`} className="btn-outline">
              <Home aria-hidden="true" className="h-4 w-4" />
              {t('home')}
            </Link>
          </div>

          {error.digest && (
            <p className="mt-6 font-mono text-xs text-stone">
              {t('reference', { digest: error.digest })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
