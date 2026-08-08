'use client'

import { usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { isItemActive } from './active-route'
import type { MenuItem } from '@/types'

/**
 * Active-state resolver for a whole menu tree.
 *
 * Returns a predicate rather than a boolean so a component can ask about each
 * item as it renders, at any depth, without threading the pathname down.
 *
 * The matching rules themselves live in `active-route.ts` — see that file for
 * why they are not in here.
 */
export function useActiveMenuItem(): (item: MenuItem) => boolean {
  const pathname = usePathname()
  return useCallback((item: MenuItem) => isItemActive(item, pathname), [pathname])
}
