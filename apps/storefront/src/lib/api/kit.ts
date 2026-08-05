// ─────────────────────────────────────────────────────────────
// Kit builder.
//
// Replaces `@/data/kit-categories`, which grouped a bundled copy of the
// product list by category slug. That file could not know about products
// added after the last deploy, and silently produced an empty step whenever a
// category slug changed.
// ─────────────────────────────────────────────────────────────

import { apiFetchSafe } from './client'
import { adaptProduct } from './adapters'
import type { WireProduct } from './wire'
import type { KitCategory } from '@/types'

interface WireKitCategory {
  id: string
  slug: string
  nameEn: string
  nameUr: string
  nameAr: string
  icon: string
  required: boolean
  order: number
  isActive: boolean
  categorySlugs: string[]
  products: WireProduct[]
}

/**
 * Public read, so it degrades to an empty list rather than failing the page.
 * The builder renders its own "temporarily unavailable" state when it gets
 * nothing back — better than a 500 on a page reachable from the main nav.
 */
export async function fetchKitCategories(): Promise<KitCategory[]> {
  const wire = await apiFetchSafe<WireKitCategory[]>('/kit-categories', [], {
    anonymous: true,
    // Kit steps change when merchandising changes, not per request, but the
    // products inside them change with stock — so this is cached for minutes,
    // not the catalogue's longer window.
    next: { revalidate: 120 },
  })

  return wire.map((k) => ({
    id: k.id,
    name: { en: k.nameEn, ur: k.nameUr, ar: k.nameAr },
    icon: k.icon,
    required: k.required,
    products: (k.products ?? []).map(adaptProduct),
  }))
}
