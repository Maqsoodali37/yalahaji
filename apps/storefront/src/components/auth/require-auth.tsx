'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

/**
 * Gate for the customer account area.
 *
 * **This is a UX guard, not a security boundary.** The bearer token lives in
 * `localStorage`, which Next's middleware cannot read, so no server-side check
 * is possible for these routes. The real boundary is the API, where every
 * `/users/me/*`, `/orders` and `/returns` route carries `JwtAuthGuard` and
 * scopes by `userId`. What this component fixes is the experience: without it
 * a signed-out visitor reached `/account/orders`, saw a generic "could not
 * load" panel, and a Retry button that could never succeed.
 *
 * Two failure modes it is specifically written to avoid:
 *
 * 1. **Bouncing a signed-in customer on refresh.** The persisted store starts
 *    with `user: null` and confirms the token against the API asynchronously,
 *    so redirecting on `!user` alone would throw a valid session out on every
 *    hard reload. Hence the wait on `isHydrating`.
 *
 * 2. **Losing where they were going.** The destination is carried in `?next=`
 *    so the login form can return them to the page they asked for rather than
 *    dropping everyone on the order list.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const t = useTranslations('guest')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const user = useAuthStore((s) => s.user)
  const isHydrating = useAuthStore((s) => s.isHydrating)

  const shouldRedirect = !isHydrating && !user

  useEffect(() => {
    if (!shouldRedirect) return

    // Preserve the query string too — a customer following a link to a
    // filtered view should land back on that view, not its bare path.
    const query = searchParams.toString()
    const next = query ? `${pathname}?${query}` : pathname

    router.replace(`/${locale}/login?next=${encodeURIComponent(next)}`)
  }, [shouldRedirect, router, locale, pathname, searchParams])

  if (isHydrating) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
        <Loader2 className="w-5 h-5 animate-spin text-stone" />
        <span className="sr-only">{t('checking')}</span>
      </div>
    )
  }

  // Redirecting. Rendering the children for the frame before the route change
  // lands would fire their queries as an anonymous user and flash a 401 panel.
  if (!user) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
        <Loader2 className="w-5 h-5 animate-spin text-stone" />
        <span className="sr-only">{t('signInRequired')}</span>
      </div>
    )
  }

  return <>{children}</>
}
