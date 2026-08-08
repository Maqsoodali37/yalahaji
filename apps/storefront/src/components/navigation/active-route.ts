import type { MenuItem } from '@/types'

/**
 * Route matching for the active-nav state.
 *
 * Deliberately a separate module from `use-active-menu-item.ts`: that file
 * imports `next/navigation`, and Vitest runs with `environment: 'node'` and no
 * setup file, so a spec importing it would be the first in this repo to drag a
 * Next runtime module into the test process. Every rule worth pinning is pure,
 * so it lives here where a test can reach it without any of that.
 */

/** Query string and hash are not part of the route — `/shop?filter=sale` is `/shop`. */
export function routeOf(href: string): string {
  const cut = href.search(/[?#]/)
  const path = cut === -1 ? href : href.slice(0, cut)
  // Trailing slash normalised so `/en/shop/` and `/en/shop` compare equal.
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

/**
 * Whether a route is the current page, or an ancestor of it.
 *
 * The prefix half is what makes a parent highlight while a child page is
 * open: on `/en/shop/ihram/premium`, both "Ihram" and "Premium" should read
 * as active.
 *
 * The locale root is excluded from the prefix rule deliberately. `/en` is a
 * prefix of literally every route in the app, so a "Home" item would be
 * permanently highlighted and the active state would mean nothing anywhere.
 *
 * The trailing slash in the prefix comparison matters too: without it,
 * `/en/shop/ihram-belts` would light up "Ihram", a different category that
 * merely starts with the same characters.
 */
export function matchesRoute(pathname: string, href: string): boolean {
  const route = routeOf(href)
  const current = routeOf(pathname)

  if (route === current) return true
  // `/en` or `/` — one segment or fewer means the locale root.
  if (route.split('/').filter(Boolean).length <= 1) return false
  return current.startsWith(`${route}/`)
}

/**
 * An item is active when it matches the route itself **or** when any
 * descendant does.
 *
 * Without the descendant half, opening a mega-menu child leaves its parent
 * looking unvisited while the customer is standing on its page.
 */
export function isItemActive(item: MenuItem, pathname: string): boolean {
  if (item.href && matchesRoute(pathname, item.href)) return true
  return item.children.some((child) => isItemActive(child, pathname))
}
