import { apiFetchSafe, buildQuery } from './client'
import { adaptCategory, adaptReview, adaptBlogPost, adaptSettings, fromBlogCategory } from './adapters'
import type { StoreSettings } from './adapters'
import type { Paginated, WireCategory, WireReview, WireBlogPost, WirePublicSettings } from './wire'
import type { Category, Review, BlogPost, BlogCategory } from '@/types'

const PUBLIC_READ = { anonymous: true as const, next: { revalidate: 300 } }

// ─── Categories ───────────────────────────────────────────────────────────────

/** Returned as a nested tree (parentId self-relation), already ordered. */
export async function fetchCategories(): Promise<Category[]> {
  const wire = await apiFetchSafe<WireCategory[]>('/categories', [], PUBLIC_READ)
  return wire.map(adaptCategory)
}

export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  const wire = await apiFetchSafe<WireCategory | null>(
    `/categories/${encodeURIComponent(slug)}`,
    null,
    PUBLIC_READ,
  )
  return wire ? adaptCategory(wire) : null
}

export async function fetchFeaturedCategories(): Promise<Category[]> {
  const all = await fetchCategories()
  return all.filter((c) => c.featured)
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface ReviewPage {
  items: Review[]
  total: number
  totalPages: number
}

export async function fetchProductReviews(
  productId: string,
  page = 1,
  limit = 10,
): Promise<ReviewPage> {
  const res = await apiFetchSafe<Paginated<WireReview>>(
    `/reviews/product/${encodeURIComponent(productId)}${buildQuery({ page, limit })}`,
    { items: [], meta: { total: 0, page: 1, limit, totalPages: 0 } },
    // Reviews change more often than the catalogue and appear below the fold.
    { anonymous: true, next: { revalidate: 60 } },
  )
  return {
    items: res.items.map(adaptReview),
    total: res.meta.total,
    totalPages: res.meta.totalPages,
  }
}

// ─── Blog ─────────────────────────────────────────────────────────────────────

export interface BlogPage {
  items: BlogPost[]
  total: number
  totalPages: number
}

export async function fetchBlogPosts(page = 1, limit = 12): Promise<BlogPage> {
  const res = await apiFetchSafe<Paginated<WireBlogPost>>(
    `/blog${buildQuery({ page, limit })}`,
    { items: [], meta: { total: 0, page: 1, limit, totalPages: 0 } },
    PUBLIC_READ,
  )
  return {
    items: res.items.map(adaptBlogPost),
    total: res.meta.total,
    totalPages: res.meta.totalPages,
  }
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const wire = await apiFetchSafe<WireBlogPost | null>(
    `/blog/${encodeURIComponent(slug)}`,
    null,
    PUBLIC_READ,
  )
  return wire ? adaptBlogPost(wire) : null
}

export async function fetchFeaturedBlogPosts(limit = 3): Promise<BlogPost[]> {
  const { items } = await fetchBlogPosts(1, 24)
  const featured = items.filter((p) => p.featured)
  // Fall back to most recent so the homepage strip is never empty just
  // because nobody has ticked "featured" on a post yet.
  return (featured.length ? featured : items).slice(0, limit)
}

/**
 * The API has no category filter on /blog, so this filters client-side over
 * the first page. `fromBlogCategory` is still applied so the comparison is
 * made in one consistent representation.
 */
export async function fetchBlogPostsByCategory(category: BlogCategory): Promise<BlogPost[]> {
  const { items } = await fetchBlogPosts(1, 50)
  const wanted = fromBlogCategory(category)
  return items.filter((p) => fromBlogCategory(p.category) === wanted)
}

// ─── Settings ─────────────────────────────────────────────────────────────────

/**
 * Shipping thresholds and currency. Falls back to the API's own seeded
 * defaults (₨2,999 free-shipping threshold) rather than the storefront's old
 * hardcoded ₨5,000, so an unreachable settings endpoint degrades toward the
 * value the server will actually charge against.
 */
export const SETTINGS_FALLBACK: StoreSettings = {
  freeShippingThreshold: 2999,
  standardShippingCost: 299,
  expressShippingCost: 499,
  codFee: 0,
  currency: '₨',
}

export async function fetchSettings(): Promise<StoreSettings> {
  const wire = await apiFetchSafe<WirePublicSettings | null>('/settings/public', null, {
    anonymous: true,
    next: { revalidate: 600 },
  })
  return wire ? adaptSettings(wire) : SETTINGS_FALLBACK
}
