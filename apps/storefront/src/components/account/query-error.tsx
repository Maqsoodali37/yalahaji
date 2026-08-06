'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { AlertCircle, LogIn } from 'lucide-react'
import { ApiError } from '@/lib/api'

/**
 * The failure panel for an account screen.
 *
 * A rejected request and an expired session are not the same problem, and
 * offering "Retry" for the second is advice that cannot work — every retry
 * fails identically because the token is gone, not because the network
 * stumbled. `RequireAuth` catches the signed-out case on entry; this catches
 * the session that expires while someone is already on the page.
 */
export function AccountQueryError({
  error,
  onRetry,
  title,
  what,
}: {
  error: unknown
  onRetry?: () => void
  /** e.g. "Could not load your orders" */
  title: string
  /** Key in the `guest` namespace naming the resource, e.g. "orders". */
  what: 'orders' | 'wishlist' | 'addresses' | 'profile' | 'returns' | 'account'
}) {
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations('guest')

  const isAuthError = error instanceof ApiError && error.isAuthError

  if (isAuthError) {
    return (
      <div className="bg-white border border-line rounded-md p-12 text-center">
        <LogIn className="w-12 h-12 text-stone mx-auto mb-4" />
        <p className="font-semibold text-ink mb-1">{t('signInRequired')}</p>
        <p className="text-sm text-stone mb-4">{t('signInToSee', { what: t(what) })}</p>
        <Link
          href={`/${locale}/login?next=${encodeURIComponent(pathname)}`}
          className="btn-primary"
        >
          {t('signInCta')}
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white border border-alert/30 rounded-md p-12 text-center">
      <AlertCircle className="w-12 h-12 text-alert mx-auto mb-4" />
      <p className="font-semibold text-ink mb-1">{title}</p>
      <p className="text-sm text-stone mb-4">
        {error instanceof ApiError && error.status === 0
          ? error.message
          : 'Something went wrong on our side.'}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline text-sm py-2 px-4">
          Try again
        </button>
      )}
    </div>
  )
}
