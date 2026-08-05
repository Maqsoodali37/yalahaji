/**
 * Google Analytics 4 — measurement ID, consent state and typed event helpers.
 *
 * Everything here is a no-op when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset, so
 * local development and preview builds never pollute the property. The tag
 * itself is mounted in components/analytics/google-analytics.tsx.
 *
 * Consent Mode v2 is on: analytics_storage and ad_storage default to "denied"
 * before gtag.js loads, and are only granted once the visitor accepts. Google
 * still receives cookieless pings while consent is denied, which is what keeps
 * the reports from going to zero. Nothing here writes a Google cookie until
 * the visitor says yes.
 */

/**
 * Read at module scope, not inside the helpers. NEXT_PUBLIC_* values are
 * inlined at build time, and a bare `process.env.X` is the only form the Next
 * compiler substitutes — a dynamic lookup would resolve to undefined.
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ''

/** Guards every call site so a missing ID silently disables tracking. */
export const isAnalyticsEnabled = GA_MEASUREMENT_ID.length > 0

/** GA4 wants a three-letter ISO-4217 code; the store prices everything in PKR. */
export const CURRENCY = 'PKR'

/** localStorage key holding the visitor's consent decision. */
export const CONSENT_STORAGE_KEY = 'yh-consent-v1'

export type ConsentChoice = 'granted' | 'denied'

type GtagArgs =
  | ['js', Date]
  | ['config', string, Record<string, unknown>?]
  | ['event', string, Record<string, unknown>?]
  | ['consent', 'default' | 'update', Record<string, unknown>]
  | ['set', Record<string, unknown>]

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: GtagArgs) => void
  }
}

/**
 * Pushes to dataLayer directly rather than calling window.gtag.
 *
 * The two are equivalent once gtag.js has executed, but the inline consent
 * snippet defines dataLayer before the script tag loads — so a push made
 * during that window is still replayed in order, where a window.gtag call
 * would be dropped.
 */
function push(...args: GtagArgs): void {
  if (!isAnalyticsEnabled || typeof window === 'undefined') return
  window.dataLayer = window.dataLayer ?? []
  // gtag's documented shim relies on `arguments`, so the array must be pushed
  // as-is rather than spread into an object.
  window.dataLayer.push(args)
}

/** Fires a raw GA4 event. Prefer the named helpers below where one exists. */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  push('event', name, params)
}

// ── Consent ───────────────────────────────────────────────────────────────────

/** The stored decision, or null when the visitor has not chosen yet. */
export function readStoredConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    // Safari private mode throws on localStorage access rather than returning
    // null. Treat it as "no decision recorded" and keep consent denied.
    return null
  }
}

/**
 * Records the decision and tells Google about it.
 *
 * ad_user_data and ad_personalization are the two signals Consent Mode v2
 * added; omitting them degrades remarketing and conversion modelling even
 * when ad_storage is granted.
 */
export function setConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice)
  } catch {
    // Storage unavailable — the banner reappears next visit, which is the
    // conservative failure mode.
  }

  push('consent', 'update', {
    analytics_storage: choice,
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
  })
}

// ── Page views ────────────────────────────────────────────────────────────────

/**
 * Sent manually on every route change, including the first paint.
 *
 * The tag is configured with send_page_view: false precisely so this is the
 * only source of page_view — App Router client navigations do not reload
 * gtag.js, so relying on its automatic hit would under-count every page after
 * the entry one.
 */
export function trackPageView(url: string, title?: string): void {
  push('event', 'page_view', {
    page_path: url,
    page_location: typeof window !== 'undefined' ? window.location.href : url,
    ...(title ? { page_title: title } : {}),
  })
}

// ── Ecommerce ─────────────────────────────────────────────────────────────────

/** The subset of GA4's item schema this store populates. */
export interface AnalyticsItem {
  item_id: string
  item_name: string
  item_variant?: string
  item_category?: string
  item_list_name?: string
  price: number
  quantity?: number
  discount?: number
}

/**
 * Maps a cart line (or anything shaped like one) to GA4's item schema.
 *
 * Kept here rather than in the store so every call site — cart, product page,
 * kit builder, compare — produces identically-shaped items. Mismatched
 * item_id values between add_to_cart and purchase are the usual reason GA4
 * ecommerce funnels come out empty.
 */
export function toAnalyticsItem(source: {
  productId: string
  variantId: string
  name: string
  tier?: string
  size?: string
  color?: string
  scent?: string
  price: number
  compareAtPrice?: number
  quantity?: number
}): AnalyticsItem {
  // Variant, not product, is what the visitor actually buys, and it is what
  // the API keys on — so it is the item_id.
  const variantLabel = [source.tier, source.size, source.color, source.scent]
    .filter(Boolean)
    .join(' / ')

  return {
    item_id: source.variantId,
    item_name: source.name,
    ...(variantLabel ? { item_variant: variantLabel } : {}),
    price: source.price,
    quantity: source.quantity ?? 1,
    ...(source.compareAtPrice && source.compareAtPrice > source.price
      ? { discount: Number((source.compareAtPrice - source.price).toFixed(2)) }
      : {}),
  }
}

/** Sums price × quantity — GA4 expects `value` net of nothing but discounts. */
function sumValue(items: AnalyticsItem[]): number {
  return Number(
    items
      .reduce((total, item) => total + item.price * (item.quantity ?? 1), 0)
      .toFixed(2),
  )
}

export function trackViewItem(item: AnalyticsItem): void {
  trackEvent('view_item', {
    currency: CURRENCY,
    value: sumValue([item]),
    items: [item],
  })
}

export function trackViewItemList(
  items: AnalyticsItem[],
  listName: string,
): void {
  if (items.length === 0) return
  trackEvent('view_item_list', {
    item_list_name: listName,
    items: items.map((item, index) => ({
      ...item,
      item_list_name: listName,
      index,
    })),
  })
}

export function trackSelectItem(item: AnalyticsItem, listName: string): void {
  trackEvent('select_item', {
    item_list_name: listName,
    items: [{ ...item, item_list_name: listName }],
  })
}

export function trackAddToCart(items: AnalyticsItem[]): void {
  if (items.length === 0) return
  trackEvent('add_to_cart', {
    currency: CURRENCY,
    value: sumValue(items),
    items,
  })
}

export function trackRemoveFromCart(items: AnalyticsItem[]): void {
  if (items.length === 0) return
  trackEvent('remove_from_cart', {
    currency: CURRENCY,
    value: sumValue(items),
    items,
  })
}

export function trackViewCart(items: AnalyticsItem[]): void {
  if (items.length === 0) return
  trackEvent('view_cart', {
    currency: CURRENCY,
    value: sumValue(items),
    items,
  })
}

export function trackAddToWishlist(item: AnalyticsItem): void {
  trackEvent('add_to_wishlist', {
    currency: CURRENCY,
    value: sumValue([item]),
    items: [item],
  })
}

export function trackBeginCheckout(
  items: AnalyticsItem[],
  options: { value: number; coupon?: string } ,
): void {
  if (items.length === 0) return
  trackEvent('begin_checkout', {
    currency: CURRENCY,
    value: Number(options.value.toFixed(2)),
    ...(options.coupon ? { coupon: options.coupon } : {}),
    items,
  })
}

export function trackAddPaymentInfo(
  items: AnalyticsItem[],
  options: { value: number; paymentType: string; coupon?: string },
): void {
  if (items.length === 0) return
  trackEvent('add_payment_info', {
    currency: CURRENCY,
    value: Number(options.value.toFixed(2)),
    payment_type: options.paymentType,
    ...(options.coupon ? { coupon: options.coupon } : {}),
    items,
  })
}

export function trackAddShippingInfo(
  items: AnalyticsItem[],
  options: { value: number; shippingTier: string; coupon?: string },
): void {
  if (items.length === 0) return
  trackEvent('add_shipping_info', {
    currency: CURRENCY,
    value: Number(options.value.toFixed(2)),
    shipping_tier: options.shippingTier,
    ...(options.coupon ? { coupon: options.coupon } : {}),
    items,
  })
}

/**
 * The one event that must not fire twice — GA4 deduplicates on
 * transaction_id, so the caller is responsible for passing a stable order
 * number rather than regenerating one on re-render.
 */
export function trackPurchase(
  items: AnalyticsItem[],
  options: {
    transactionId: string
    value: number
    shipping?: number
    tax?: number
    coupon?: string
  },
): void {
  trackEvent('purchase', {
    transaction_id: options.transactionId,
    currency: CURRENCY,
    value: Number(options.value.toFixed(2)),
    ...(options.shipping !== undefined ? { shipping: options.shipping } : {}),
    ...(options.tax !== undefined ? { tax: options.tax } : {}),
    ...(options.coupon ? { coupon: options.coupon } : {}),
    items,
  })
}

// ── Non-commerce events ───────────────────────────────────────────────────────

export function trackSearch(term: string): void {
  if (!term.trim()) return
  trackEvent('search', { search_term: term })
}

export function trackShare(method: string, contentId: string): void {
  trackEvent('share', {
    method,
    content_type: 'product',
    item_id: contentId,
  })
}
