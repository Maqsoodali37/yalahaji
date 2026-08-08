import { apiFetch, ApiError } from './client'
import { adaptMenu } from './adapters'
import type { WireMenu } from './wire'
import type { Locale, Menu, MenuLocation } from '@/types'

/** Tag every menu fetch carries, so one `revalidateTag` call drops all of them. */
export const MENU_CACHE_TAG = 'menus'

/**
 * Navigation of last resort.
 *
 * Reached only when the API is unreachable *and* nothing is cached — a cold
 * container during an outage. Two links, both to routes that render without
 * the API: enough that the header is not an empty bar and someone can still
 * reach a person, deliberately not a guess at what the real menu contained.
 *
 * This is NOT the general fallback path. A menu the API served once stays in
 * the Next fetch cache for its TTL and is served from there through a short
 * outage, which is the case that actually happens.
 */
export function fallbackMenu(location: MenuLocation, locale: Locale): Menu {
  return {
    id: `fallback-${location}`,
    location,
    cacheTtl: 60,
    items: [
      {
        id: 'fallback-home',
        title: { en: 'Home', ur: 'ہوم', ar: 'الرئيسية' },
        linkType: 'custom',
        href: `/${locale}`,
        isExternal: false,
        device: 'all',
        openInNewTab: false,
        isMegaMenu: false,
        megaColumns: 4,
        children: [],
      },
      {
        id: 'fallback-contact',
        title: { en: 'Contact', ur: 'رابطہ', ar: 'اتصل بنا' },
        linkType: 'custom',
        href: `/${locale}/about`,
        isExternal: false,
        device: 'all',
        openInNewTab: false,
        isMegaMenu: false,
        megaColumns: 4,
        children: [],
      },
    ],
  }
}

/** Locations whose absence is a configuration choice, not a degraded state. */
const OPTIONAL_LOCATIONS: MenuLocation[] = ['sidebar', 'mega']

const PATHS: Record<MenuLocation, string> = {
  header: '/menus/header',
  footer: '/menus/footer',
  mobile: '/menus/mobile',
  sidebar: '/menus/location/sidebar',
  mega: '/menus/location/mega',
}

/**
 * A menu for a server render.
 *
 * Deliberately **not** `apiFetchSafe`, and deliberately not
 * `apiFetchResource` either. Those two split "missing" from "broken" for a
 * page; a menu needs a third answer, because the two failures want opposite
 * treatment and neither should ever throw into a page a customer is trying to
 * buy from:
 *
 *   404  — no menu is configured at this location. `null`, so the caller can
 *          simply render nothing. A sidebar that has not been set up is not
 *          an error, and a "Home / Contact" stub in its place would be worse
 *          than the empty space.
 *   else — the API is unreachable. The minimal fallback, so the layout keeps
 *          its shape and the page stays usable.
 *
 * Anonymous, so the payload is the guest view and can be shared by every
 * server render and every crawler. `MenuProvider` re-fetches with the
 * customer's token once auth has hydrated, which is what makes audience rules
 * work without making this fetch per-user.
 */
export async function fetchMenu(
  location: MenuLocation,
  locale: Locale,
): Promise<Menu | null> {
  try {
    const wire = await apiFetch<WireMenu>(PATHS[location], {
      anonymous: true,
      // No abort signal. Next opts a `fetch` carrying one out of its Data
      // Cache, which would leave the `menus` tag below with nothing attached
      // to it — and `revalidateTag('menus')`, and therefore the whole publish
      // path, a no-op. The bound this gives up is covered by the fallback in
      // the catch block: a hanging API degrades to the minimal nav rather
      // than to an unbounded wait.
      signal: null,
      next: {
        // Deliberately shorter than the API's own TTL. The two caches are in
        // series, so the worst case for a change is the sum of both — keeping
        // this end short means an admin who publishes sees it promptly even
        // if the revalidate webhook never arrives.
        revalidate: 60,
        tags: [MENU_CACHE_TAG],
      },
    })
    return adaptMenu(wire, locale)
  } catch (e) {
    if (e instanceof ApiError && e.isNotFound) return null

    // Logged, not swallowed silently: a header quietly reduced to two links
    // is exactly the kind of degradation nobody notices until someone asks
    // why traffic to a category collapsed.
    console.error(
      `[menus] ${location} could not be loaded (${(e as Error).message}) — ${
        OPTIONAL_LOCATIONS.includes(location) ? 'rendering nothing' : 'rendering the minimal fallback'
      }.`,
    )

    // Only the menus a customer needs to move around the site get the stub.
    // A sidebar or a mega location is optional furniture, and a "Home /
    // Contact" panel appearing in it *only during an outage* would be a
    // stranger result than the empty space it normally occupies.
    if (OPTIONAL_LOCATIONS.includes(location)) return null

    return fallbackMenu(location, locale)
  }
}

/**
 * The same read from the browser, with the customer's token attached.
 *
 * `apiFetch` picks the bearer token up from storage, so the API can resolve a
 * real audience and apply the guest / customer / retail / wholesale rules.
 * Throws on failure so TanStack Query can keep the server-rendered menu as
 * its previous data rather than replacing a working header with a fallback.
 */
export async function fetchMenuForCustomer(
  location: MenuLocation,
  locale: Locale,
): Promise<Menu | null> {
  try {
    const wire = await apiFetch<WireMenu>(PATHS[location], { cache: 'no-store' })
    return adaptMenu(wire, locale)
  } catch (e) {
    if (e instanceof ApiError && e.isNotFound) return null
    throw e
  }
}
