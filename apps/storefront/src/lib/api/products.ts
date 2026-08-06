import { apiFetch, apiFetchSafe, apiFetchResource, buildQuery } from './client'
import { adaptProduct, rupeesToPaisas } from './adapters'
import type { Paginated, WireProduct } from './wire'
import type { Product, Tier } from '@/types'

export interface ProductFilters {
  category?: string
  tier?: Tier[]
  size?: string[]
  color?: string[]
  scent?: string[]
  minPrice?: number // rupees
  maxPrice?: number // rupees
  rating?: number
  inStock?: boolean
  badges?: string[]
  search?: string
  sort?: string
  page?: number
  limit?: number
}

export interface ProductPage {
  items: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const EMPTY_PAGE: ProductPage = { items: [], total: 0, page: 1, limit: 24, totalPages: 0 }

/**
 * The API's price filter is documented in rupees and multiplies by 100 itself
 * (`price: { gte: minPrice * 100 }`), so these two are passed through as-is —
 * converting here would divide the filter by 100 against the catalogue.
 */
function toQuery(f: ProductFilters) {
  return buildQuery({
    category: f.category,
    tier: f.tier,
    size: f.size,
    color: f.color,
    scent: f.scent,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    rating: f.rating,
    inStock: f.inStock,
    badges: f.badges,
    search: f.search,
    sort: f.sort,
    page: f.page,
    limit: f.limit,
  })
}

/** Catalogue reads are public and cached — no auth headers, revalidate hourly. */
const PUBLIC_READ = { anonymous: true as const, next: { revalidate: 300 } }

export async function fetchProducts(filters: ProductFilters = {}): Promise<ProductPage> {
  const res = await apiFetchSafe<Paginated<WireProduct>>(
    `/products${toQuery(filters)}`,
    { items: [], meta: { total: 0, page: 1, limit: 24, totalPages: 0 } },
    PUBLIC_READ,
  )

  return {
    items: res.items.map(adaptProduct),
    total: res.meta.total,
    page: res.meta.page,
    limit: res.meta.limit,
    totalPages: res.meta.totalPages,
  }
}

/**
 * Null means the product is genuinely missing — deleted, unpublished, or a
 * slug that never existed — so the page can call `notFound()`. An unreachable
 * API throws instead of reading as missing; see `apiFetchResource`.
 */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const wire = await apiFetchResource<WireProduct>(
    `/products/${encodeURIComponent(slug)}`,
    PUBLIC_READ,
  )
  return wire ? adaptProduct(wire) : null
}

export async function fetchRelatedProducts(productId: string, limit = 4): Promise<Product[]> {
  const wire = await apiFetchSafe<WireProduct[]>(
    `/products/${encodeURIComponent(productId)}/related${buildQuery({ limit })}`,
    [],
    PUBLIC_READ,
  )
  return wire.map(adaptProduct)
}

export async function fetchFeaturedProducts(limit = 8): Promise<Product[]> {
  const page = await fetchProducts({ sort: 'featured', limit })
  return page.items
}

export async function fetchNewArrivals(limit = 8): Promise<Product[]> {
  const page = await fetchProducts({ sort: 'newest', limit })
  return page.items
}

/**
 * Predictive search. Uses the catalogue endpoint rather than /search so
 * results come back as full products the dropdown can render with price and
 * image; /search returns MeiliSearch documents in a different shape.
 */
export async function searchProducts(query: string, limit = 6): Promise<Product[]> {
  if (!query.trim()) return []
  const page = await fetchProducts({ search: query.trim(), limit })
  return page.items
}

/** Register interest in an out-of-stock product ("Notify me"). */
export async function notifyWhenInStock(productId: string, email: string) {
  return apiFetch<{ ok: boolean }>('/stock-notifications', {
    method: 'POST',
    body: { productId, email },
    anonymous: true,
  })
}

export { rupeesToPaisas }
