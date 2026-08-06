'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useAuthStore } from '@/store/auth'

/**
 * The account root.
 *
 * This used to be a server component that unconditionally redirected to
 * `/account/orders`. That ran before any client code, so a guest was bounced
 * to the order list — a page they cannot use — and the guest dashboard could
 * never render.
 *
 * The redirect is therefore conditional and client-side: signed-in customers
 * still land on their orders, and everyone else falls through to the layout,
 * which shows the guest dashboard. `isHydrating` is respected so a customer
 * refreshing this page is not treated as a guest for the frame before their
 * token is confirmed.
 */
export default function AccountPage() {
  const locale = useLocale()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isHydrating = useAuthStore((s) => s.isHydrating)

  useEffect(() => {
    if (!isHydrating && user) router.replace(`/${locale}/account/orders`)
  }, [isHydrating, user, router, locale])

  // The layout renders the guest dashboard in place of these children when
  // there is no user, and a loader while hydrating, so there is nothing for
  // this page itself to draw.
  return null
}
