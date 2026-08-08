'use client'

import { createContext, useContext, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { fetchMenuForCustomer } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { Locale, Menu, MenuLocation } from '@/types'

type MenuMap = Partial<Record<MenuLocation, Menu | null>>

const MenuContext = createContext<MenuMap>({})

/**
 * Holds every menu the layout fetched, so Header, Footer, the mobile drawer
 * and any sidebar read from one payload.
 *
 * Fetching in the layout and sharing through context rather than each
 * component calling `fetchMenu` for itself is the same reasoning as
 * `CartBootstrap` loading shop settings once: four components asking for the
 * header menu is four round trips for an answer that cannot differ between
 * them.
 */
export function MenuProvider({
  menus,
  children,
}: {
  menus: MenuMap
  children: React.ReactNode
}) {
  const locale = useLocale() as Locale
  const user = useAuthStore((s) => s.user)
  const isHydrating = useAuthStore((s) => s.isHydrating)

  // The server render is anonymous — it has to be, or the payload could not
  // be cached and shared across every visitor. That makes it the guest view.
  // Once the token has been confirmed in the browser, re-fetch so the API can
  // apply the customer / retail / wholesale visibility rules against a
  // principal it has actually verified.
  //
  // `enabled` waits on `isHydrating` for the same reason `RequireAuth` does:
  // the persisted auth store starts at `user: null` and confirms the token
  // asynchronously, so firing on `!user` alone would run an anonymous refetch
  // on every hard refresh and then a second one a moment later.
  // Only the locations the server actually resolved. Including the ones that
  // came back `null` would re-request an endpoint already known to 404, once
  // per location, on every sign-in.
  const locations = useMemo(
    () =>
      (Object.entries(menus) as Array<[MenuLocation, Menu | null]>)
        .filter(([, menu]) => menu !== null)
        .map(([location]) => location),
    [menus],
  )

  const customerMenus = useQuery({
    queryKey: ['menus', 'customer', user?.id ?? null, locale, locations],
    enabled: !isHydrating && !!user,
    // Menus change a few times a year. Long enough that navigating around the
    // site does not re-request them, short enough that a published change is
    // picked up within a session.
    staleTime: 5 * 60 * 1000,
    // Keeping the server payload on failure is the point: a customer whose
    // refetch fails keeps the guest header, which is a correct menu missing
    // at most a couple of account-only entries — far better than a fallback.
    retry: 1,
    queryFn: async (): Promise<MenuMap> => {
      const entries = await Promise.all(
        locations.map(async (location) => {
          try {
            return [location, await fetchMenuForCustomer(location, locale)] as const
          } catch {
            // Per location, so one failing menu does not drop the other three
            // back to their guest versions.
            return [location, menus[location] ?? null] as const
          }
        }),
      )
      return Object.fromEntries(entries) as MenuMap
    },
  })

  const value = useMemo<MenuMap>(
    () => ({ ...menus, ...(customerMenus.data ?? {}) }),
    [menus, customerMenus.data],
  )

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

/**
 * The menu for one location, or `null` when none is configured.
 *
 * `null` and "an empty list" are different answers and callers treat them
 * differently — a sidebar that was never set up renders nothing at all, where
 * a configured-but-currently-empty one still renders its container.
 */
export function useMenu(location: MenuLocation): Menu | null {
  return useContext(MenuContext)[location] ?? null
}
