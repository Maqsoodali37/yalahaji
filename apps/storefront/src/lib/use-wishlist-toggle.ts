'use client'

import { useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useAuthStore } from '@/store/auth'
import { useWishlistStore } from '@/store/wishlist'

/**
 * One definition of what the heart icon does, for every surface that shows one.
 *
 * The product card and the product page previously called the store directly
 * and would happily "save" for a signed-out visitor — into a device-local list
 * that never reached their account. Centralising it means a guest gets the
 * same honest answer everywhere: sign in, and come back to this page.
 */
export function useWishlistToggle() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const user = useAuthStore((s) => s.user)
  const isHydrating = useAuthStore((s) => s.isHydrating)
  const toggle = useWishlistStore((s) => s.toggle)
  const isInWishlist = useWishlistStore((s) => s.isInWishlist)

  const onToggle = useCallback(
    (productId: string) => {
      // Mid-hydration the session is not yet known. Acting now would either
      // send a signed-in customer to the login page or fire an unauthenticated
      // write — so do nothing for the moment it takes to resolve.
      if (isHydrating) return

      if (!user) {
        router.push(`/${locale}/login?next=${encodeURIComponent(pathname)}`)
        return
      }

      void toggle(productId)
    },
    [isHydrating, user, router, locale, pathname, toggle],
  )

  return {
    onToggle,
    isInWishlist,
    /** Lets a caller label the control honestly before a session exists. */
    requiresSignIn: !isHydrating && !user,
  }
}
