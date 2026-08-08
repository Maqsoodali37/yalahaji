import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { MENU_CACHE_TAG } from '@/lib/api'

/**
 * Drops the storefront's cached copy of every menu.
 *
 * Called by the API whenever an admin writes a menu. Two caches sit in front
 * of a menu — Redis in the API process, and Next's own `fetch` cache in this
 * container — and nothing in Redis can reach this one. Without this route an
 * admin's change appears only when the longer of the two TTLs lapses, which
 * from the admin panel is indistinguishable from the save not working.
 *
 * Not a GET. A GET would be reachable from a link, an image tag, or a
 * prefetch, and cache invalidation is a side effect.
 */
export async function POST(request: Request) {
  const secret = process.env.MENU_REVALIDATE_SECRET

  // Unconfigured means the endpoint is off, not open. Returning 200 here
  // would make an unconfigured deployment look healthy to the API while doing
  // nothing, and every published change would silently be late.
  if (!secret) {
    return NextResponse.json(
      { revalidated: false, reason: 'MENU_REVALIDATE_SECRET is not configured.' },
      { status: 503 },
    )
  }

  const provided = request.headers.get('x-menu-revalidate-secret')

  // Not a timing-safe comparison, deliberately: the secret is compared once
  // per admin save, so there is no volume to mount a timing attack with, and
  // reaching for `timingSafeEqual` here needs equal-length buffers or it
  // throws on the very input it is meant to reject.
  if (!provided || provided !== secret) {
    return NextResponse.json({ revalidated: false }, { status: 401 })
  }

  // One tag covers every location. The API sends which location changed, and
  // it is logged rather than acted on: menu payloads are small, all of them
  // are re-fetched within a page render anyway, and per-location tags would
  // mean a missed tag leaves one stale menu with nothing to signal it.
  revalidateTag(MENU_CACHE_TAG)

  let location = 'unknown'
  try {
    const body = (await request.json()) as { location?: string }
    if (body?.location) location = body.location
  } catch {
    // A missing or malformed body is not a reason to skip the revalidation
    // that has already happened — the tag is what matters.
  }

  console.info(`[menus] cache revalidated (triggered by '${location}')`)
  return NextResponse.json({ revalidated: true, tag: MENU_CACHE_TAG, location })
}
