import { apiFetch, apiFetchSafe, buildQuery } from './client'
import {
  adaptCategory,
  adaptReview,
  adaptBlogPost,
  adaptSettings,
  fromBlogCategory,
  toBlogCategory,
} from './adapters'
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

export interface CreateReviewInput {
  productId: string
  rating: number
  title: string
  body: string
  images?: string[]
  videoUrl?: string
}

/**
 * Submit a review. Requires a signed-in customer — the API puts `POST /reviews`
 * behind `JwtAuthGuard`, so this deliberately uses `apiFetch` rather than
 * `apiFetchSafe`: a rejected submission must surface to the person who wrote
 * it, not be swallowed into a fallback that looks like success.
 *
 * The created review comes back unapproved; it appears publicly only once a
 * moderator approves it.
 */
export async function createReview(input: CreateReviewInput): Promise<Review> {
  const wire = await apiFetch<WireReview>('/reviews', {
    method: 'POST',
    body: input,
  })
  return adaptReview(wire)
}

// ─── Blog ─────────────────────────────────────────────────────────────────────

export interface BlogPage {
  items: BlogPost[]
  total: number
  totalPages: number
}

export async function fetchBlogPosts(
  page = 1,
  limit = 12,
  category?: BlogCategory,
): Promise<BlogPage> {
  const res = await apiFetchSafe<Paginated<WireBlogPost>>(
    // The API filters and paginates; the page used to fetch 50 posts and
    // filter them in the browser, which silently truncated any category with
    // posts beyond that window.
    `/blog${buildQuery({ page, limit, category: category ? fromBlogCategory(category) : undefined })}`,
    { items: [], meta: { total: 0, page: 1, limit, totalPages: 0 } },
    PUBLIC_READ,
  )
  return {
    items: res.items.map(adaptBlogPost),
    total: res.meta.total,
    totalPages: res.meta.totalPages,
  }
}

export interface BlogCategorySummary {
  /** Hyphenated, matching the storefront's `BlogCategory`. */
  slug: BlogCategory
  label: string
  count: number
}

interface WireBlogCategory {
  slug: string
  label: string
  count: number
}

/**
 * Categories that actually have published posts. Replaces a hardcoded list in
 * `@/data/blog` that named only four of the six categories, so posts filed
 * under the other two had no filter chip.
 */
export async function fetchBlogCategories(): Promise<BlogCategorySummary[]> {
  const wire = await apiFetchSafe<WireBlogCategory[]>('/blog/categories', [], PUBLIC_READ)
  return wire.map((c) => ({
    slug: toBlogCategory(c.slug),
    label: c.label,
    count: c.count,
  }))
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

export async function fetchBlogPostsByCategory(
  category: BlogCategory,
  limit = 24,
): Promise<BlogPost[]> {
  const { items } = await fetchBlogPosts(1, limit, category)
  return items
}

// ─── Settings ─────────────────────────────────────────────────────────────────

/**
 * Used when `/settings/public` cannot be reached.
 *
 * These mirror the seeded values in `apps/api/src/settings/config-catalogue.ts`
 * — deliberately, so an unreachable settings endpoint degrades toward what the
 * server will actually charge against rather than toward a number the
 * storefront invented. The storefront once hardcoded a ₨5,000 free-shipping
 * threshold while the API used ₨2,999, so the progress bar and the invoice
 * disagreed.
 *
 * Feature flags fail *open* for things that merely display (coupons, guest
 * checkout) and *closed* for anything that would imply we can take money we
 * cannot (online and wallet payment).
 */
export const SETTINGS_FALLBACK: StoreSettings = {
  freeShippingThreshold: 2999,
  standardShippingCost: 299,
  expressShippingCost: 499,

  codFee: 0,
  minOrderAmount: 0,
  giftWrapPrice: 99,
  taxPercentage: 0,
  guestCheckoutEnabled: true,

  currency: 'PKR',
  currencySymbol: '₨',

  codEnabled: true,
  onlinePaymentEnabled: false,
  walletPaymentEnabled: false,

  storeName: 'Yala Haji',
  storeEmail: 'salam@yalahaji.com',
  storePhone: '+923001234567',

  maintenanceMode: false,
  couponEnabled: true,
}

export async function fetchSettings(): Promise<StoreSettings> {
  const wire = await apiFetchSafe<WirePublicSettings | null>('/settings/public', null, {
    anonymous: true,
    // Short enough that an admin editing a shipping fee sees it take effect
    // without a redeploy; long enough that this is not a per-request round
    // trip on every page.
    next: { revalidate: 60 },
  })

  // An empty object is a valid response shape but means nothing is published —
  // treat it as unreachable rather than adopting every fallback silently.
  if (!wire || Object.keys(wire).length === 0) return SETTINGS_FALLBACK
  return adaptSettings(wire)
}
