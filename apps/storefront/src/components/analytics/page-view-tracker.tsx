'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

/**
 * Sends one page_view per route change, including the initial render.
 *
 * useSearchParams opts the subtree into client-side rendering, which would
 * force every page in the app into dynamic rendering if it were not wrapped in
 * Suspense — hence the split into an inner component and a boundary.
 */
function Tracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    trackPageView(query ? `${pathname}?${query}` : pathname, document.title)
    // Filter and sort params live in the URL on /shop, so the query string is
    // part of the identity of the view and belongs in the dependency list.
  }, [pathname, searchParams])

  return null
}

export function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  )
}
