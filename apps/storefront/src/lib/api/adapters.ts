// Wire → domain adapters.
//
// This is the ONLY module permitted to convert API shapes into the types in
// `@/types`. Components must never touch a Wire* type directly: every one of
// the four mismatches below is silent at runtime if it slips through, and two
// of them are wrong in ways a reviewer would not notice on a screenshot.
//
//   1. paisas → rupees. Miss it and every price renders 100× too high.
//   2. nameEn/Ur/Ar → name.{en,ur,ar}. Miss it and text renders as undefined.
//   3. hajj_guide → hajj-guide. Miss it and blog category filters silently
//      match nothing.
//   4. category.slug → categorySlug. Miss it and related-product and
//      breadcrumb lookups quietly return empty.

import { DEFAULT_COUNTRY } from '@/lib/address'
import type {
  Product, ProductVariant, ProductImage, Category, Review, BlogPost,
  BlogCategory, Order, OrderTimeline, OrderStatus, Address, User,
  CartItem, Locale, SizeGuideEntry, KitItem,
  Menu, MenuItem, MegaConfig, MegaMenuLayout,
} from '@/types'
import type {
  WireProduct, WireVariant, WireProductMedia, WireCategory, WireReview,
  WireBlogPost, WireOrder, WireOrderItem, WireAddress, WireUser,
  WireCartItem, WireSizeGuideEntry, WireKitContent, WirePublicSettings,
  WireMenu, WireMenuItem, WireMenuText, WireMegaConfig,
} from './wire'
import { INTERNAL_PATH_REGEX, MAX_MENU_DEPTH } from '@/lib/menu-constants'

// ─── Money ────────────────────────────────────────────────────────────────────

/**
 * The API stores money as integer paisas to avoid float drift; the storefront
 * displays rupees. Rounding (not truncating) keeps a 1-paisa remainder from
 * turning ₨2,499.00 into ₨2,498.99 on a discounted line.
 */
export function paisasToRupees(paisas: number | null | undefined): number {
  if (paisas === null || paisas === undefined) return 0
  return Math.round(paisas) / 100
}

/** Inverse, for values sent back to the API. */
export function rupeesToPaisas(rupees: number): number {
  return Math.round(rupees * 100)
}

// ─── Multilingual ─────────────────────────────────────────────────────────────

/**
 * Build the nested `Record<Locale, string>` the components expect.
 *
 * English is the fallback for any missing translation: a product with no Urdu
 * name should render its English name, not an empty heading.
 */
function localised(en: string | null, ur: string | null, ar: string | null): Record<Locale, string> {
  const base = en ?? ''
  return { en: base, ur: ur || base, ar: ar || base }
}

// ─── Enums ────────────────────────────────────────────────────────────────────

/** API `hajj_guide` ⇄ storefront `hajj-guide`. */
export function toBlogCategory(apiValue: string): BlogCategory {
  return apiValue.replace(/_/g, '-') as BlogCategory
}

export function fromBlogCategory(value: BlogCategory): string {
  return value.replace(/-/g, '_')
}

// ─── Product ──────────────────────────────────────────────────────────────────

function adaptImage(m: WireProductMedia, fallbackAlt: string): ProductImage {
  return {
    id: m.id,
    url: m.url,
    alt: m.alt || fallbackAlt,
    isPrimary: m.isPrimary,
  }
}

/**
 * Primary photo first, everything else in the order staff arranged.
 *
 * The API sorts media by `order` alone, and six surfaces — the product card,
 * the compare table and bar, the kit builder, the detail gallery — reach for
 * `images[0]`. Without this, ticking "primary" in the admin panel changed
 * nothing anyone could see unless that photo also happened to be first.
 *
 * Sorting here rather than at each call site is deliberate: the adapter
 * boundary is the one place that already exists to reconcile the API's shape
 * with what components expect, and a rule applied in six places is a rule that
 * will shortly be applied in five.
 */
function adaptImages(
  media: WireProductMedia[] | undefined,
  fallbackAlt: string,
): ProductImage[] {
  const images = (media ?? []).map((m) => adaptImage(m, fallbackAlt))
  const primary = images.findIndex((img) => img.isPrimary)

  // -1 covers products whose photos predate the primary flag; leaving the
  // order untouched is right, because `order` is then the only signal there is.
  if (primary <= 0) return images

  return [images[primary], ...images.filter((_, i) => i !== primary)]
}

export function adaptVariant(v: WireVariant): ProductVariant {
  return {
    id: v.id,
    sku: v.sku,
    tier: v.tier,
    size: v.size ?? undefined,
    color: v.color ?? undefined,
    colorHex: v.colorHex ?? undefined,
    scent: v.scent ?? undefined,
    price: paisasToRupees(v.price),
    compareAtPrice: v.compareAtPrice ? paisasToRupees(v.compareAtPrice) : undefined,
    stock: v.stock,
    lowStockThreshold: v.lowStockThreshold ?? 5,
  }
}

function adaptSizeGuide(e: WireSizeGuideEntry): SizeGuideEntry {
  return {
    label: e.label,
    chest: e.chest ?? undefined,
    length: e.length ?? undefined,
    waist: e.waist ?? undefined,
    fit: e.fit ?? undefined,
    fabric: e.fabric ?? undefined,
  }
}

function adaptKitContent(k: WireKitContent, parentTier: ProductVariant['tier']): KitItem {
  return {
    productId: k.member.id,
    productName: localised(k.member.nameEn, k.member.nameUr, k.member.nameAr),
    quantity: k.quantity,
    image: k.member.images?.[0]?.url ?? '',
    tier: k.tier ?? parentTier,
  }
}

const VALID_BADGES = new Set(['new', 'hot', 'sale', 'bestseller', 'limited'])

export function adaptProduct(p: WireProduct): Product {
  const name = localised(p.nameEn, p.nameUr, p.nameAr)
  const variants = (p.variants ?? []).map(adaptVariant)
  // Kit contents inherit the cheapest variant's tier when the API doesn't
  // pin one, so a kit card never renders a tier badge it doesn't have.
  const defaultTier = variants[0]?.tier ?? 'Standard'

  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name,
    description: localised(p.descEn, p.descUr, p.descAr),
    shortDescription: localised(p.shortDescEn, p.shortDescUr, p.shortDescAr),
    categoryId: p.category?.id ?? '',
    categorySlug: p.category?.slug ?? '',
    images: adaptImages(p.images, name.en),
    variants,
    tags: (p.tags ?? []).map((t) => t.tag),
    badges: (p.badges ?? [])
      .map((b) => b.badge)
      .filter((b): b is Product['badges'][number] => VALID_BADGES.has(b)),
    isKit: p.isKit,
    kitContents: p.kitContents?.length
      ? p.kitContents.map((k) => adaptKitContent(k, defaultTier))
      : undefined,
    hasGiftWrap: p.hasGiftWrap,
    hasPreOrder: p.hasPreOrder,
    sizeGuide: p.sizeGuide?.length ? p.sizeGuide.map(adaptSizeGuide) : undefined,
    avgRating: p.avgRating ?? 0,
    reviewCount: p.reviewCount ?? 0,
    soldCount: p.soldCount ?? 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

// ─── Category ─────────────────────────────────────────────────────────────────

export function adaptCategory(c: WireCategory): Category {
  return {
    id: c.id,
    slug: c.slug,
    name: localised(c.nameEn, c.nameUr, c.nameAr),
    description: localised(c.descEn, c.descUr, c.descAr),
    image: c.image ?? '',
    icon: c.icon ?? undefined,
    parentId: c.parentId ?? undefined,
    children: c.children?.map(adaptCategory),
    productCount: c.productCount ?? c._count?.products ?? 0,
    featured: c.featured ?? c.isFeatured ?? false,
    order: c.order ?? 0,
  }
}

// ─── Review ───────────────────────────────────────────────────────────────────

/** Review images are stored as a JSON string column; tolerate malformed rows. */
function parseImages(raw: string | null): string[] | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : undefined
  } catch {
    return undefined
  }
}

export function adaptReview(r: WireReview): Review {
  return {
    id: r.id,
    productId: r.productId,
    author: r.author,
    avatar: r.avatar ?? undefined,
    rating: r.rating,
    title: r.title,
    body: r.body,
    images: parseImages(r.images),
    videoUrl: r.videoUrl ?? undefined,
    verified: r.verified,
    helpful: r.helpful ?? 0,
    createdAt: r.createdAt,
  }
}

// ─── Blog ─────────────────────────────────────────────────────────────────────

export function adaptBlogPost(p: WireBlogPost): BlogPost {
  return {
    id: p.id,
    slug: p.slug,
    title: localised(p.titleEn, p.titleUr, p.titleAr),
    excerpt: localised(p.excerptEn, p.excerptUr, p.excerptAr),
    body: localised(p.bodyEn ?? '', p.bodyUr ?? '', p.bodyAr ?? ''),
    category: toBlogCategory(p.category),
    coverImage: p.coverImage ?? '',
    author: p.author,
    authorAvatar: p.authorAvatar ?? undefined,
    readingTime: p.readingTime ?? 1,
    // Drafts have no publishedAt; fall back so date formatting never gets null.
    publishedAt: p.publishedAt ?? new Date().toISOString(),
    featured: p.featured,
    tags: (p.tags ?? []).map((t) => t.tag),
  }
}

// ─── Address ──────────────────────────────────────────────────────────────────

export function adaptAddress(a: WireAddress): Address {
  return {
    id: a.id,
    label: a.label ?? 'Address',
    // Defaulted rather than assumed: an API instance predating the enum
    // returns no labelType, and `undefined` would render as a chip with
    // nothing selected on the edit form.
    labelType: a.labelType ?? 'other',
    fullName: a.fullName,
    phone: a.phone,
    email: a.email ?? undefined,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2 ?? undefined,
    area: a.area ?? undefined,
    city: a.city,
    province: a.province,
    country: a.country ?? DEFAULT_COUNTRY,
    postalCode: a.postalCode ?? undefined,
    isDefaultShipping: a.isDefaultShipping ?? false,
    isDefaultBilling: a.isDefaultBilling ?? false,
  }
}

// ─── Order ────────────────────────────────────────────────────────────────────

const TIMELINE_SEQUENCE: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered',
]

const TIMELINE_LABELS: Record<OrderStatus, string> = {
  pending: 'Order placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

function adaptOrderItem(i: WireOrderItem): CartItem {
  return {
    id: i.id,
    productId: i.productId,
    variantId: i.variantId,
    slug: i.product?.slug ?? '',
    name: i.name,
    image: i.image ?? '',
    tier: i.tier,
    sku: i.variant?.sku,
    size: i.size ?? undefined,
    color: i.color ?? undefined,
    scent: i.scent ?? undefined,
    price: paisasToRupees(i.price),
    quantity: i.quantity,
    hasGiftWrap: i.hasGiftWrap,
    giftMessage: i.giftMessage ?? undefined,
  }
}

/**
 * The API stores timeline rows only for stages an order has actually reached.
 * The UI renders a full progress track, so fill in the stages ahead as
 * incomplete — and for a cancelled or refunded order show the real history
 * instead, since projecting future steps onto a dead order would be wrong.
 */
function buildTimeline(order: WireOrder): OrderTimeline[] {
  const reached = new Map(order.timeline.map((t) => [t.status, t.createdAt]))
  const isTerminal = order.status === 'cancelled' || order.status === 'refunded'

  if (isTerminal) {
    return [...order.timeline]
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .map((t) => ({
        status: t.status,
        label: TIMELINE_LABELS[t.status] ?? t.status,
        timestamp: t.createdAt,
        completed: true,
      }))
  }

  const currentIdx = TIMELINE_SEQUENCE.indexOf(order.status)
  return TIMELINE_SEQUENCE.map((status, idx) => ({
    status,
    label: TIMELINE_LABELS[status],
    timestamp: reached.get(status),
    completed: reached.has(status) || (currentIdx >= 0 && idx <= currentIdx),
  }))
}

/**
 * A factory, not a shared constant.
 *
 * Returning one module-level object by reference means every address-less
 * order shares it — a single in-place edit anywhere downstream would show up
 * on all of them at once, which is the kind of bug that looks like the API
 * returning nonsense.
 */
const emptyAddress = (): Address => ({
  id: '', label: '', labelType: 'other', fullName: '', phone: '',
  addressLine1: '', city: '', province: '', country: DEFAULT_COUNTRY,
  isDefaultShipping: false, isDefaultBilling: false,
})

/**
 * The address the order actually shipped to.
 *
 * Read from the order's own frozen columns, **not** through `o.address`. That
 * relation points at a row the customer can still edit or delete, so rendering
 * it meant someone moving house rewrote the delivery address on every order
 * they had ever placed — including delivered ones, where the recorded
 * destination is the only evidence of where the goods went.
 *
 * The `o.address` fallback covers exactly one case: an order written by a
 * server that predates the snapshot columns, i.e. a rolling deploy where the
 * migration has run but an old API instance is still serving. Once every
 * instance is current it is dead code, and it is deliberately last so it can
 * never win over a real snapshot.
 */
function adaptShippingAddress(o: WireOrder): Address {
  if (o.shippingFullName) {
    return {
      id: o.address?.id ?? '',
      label: o.shippingLabel ?? 'Delivery address',
      // The snapshot carries the display label, not the enum — an order's
      // address is a record of a delivery, not an entry in an address book, so
      // categorising it would be inventing a fact the order never held.
      labelType: 'other',
      fullName: o.shippingFullName,
      phone: o.shippingPhone ?? '',
      email: o.shippingEmail ?? undefined,
      addressLine1: o.shippingAddressLine1 ?? '',
      addressLine2: o.shippingAddressLine2 ?? undefined,
      area: o.shippingArea ?? undefined,
      city: o.shippingCity ?? '',
      province: o.shippingProvince ?? '',
      country: o.shippingCountry ?? DEFAULT_COUNTRY,
      postalCode: o.shippingPostalCode ?? undefined,
      // An order's address is a historical record, not a preference. Marking
      // it default would let the order-detail screen render a "Default" badge
      // against a snapshot the customer may have since replaced.
      isDefaultShipping: false,
      isDefaultBilling: false,
    }
  }

  return o.address
    ? { ...adaptAddress(o.address), isDefaultShipping: false, isDefaultBilling: false }
    : emptyAddress()
}

export function adaptOrder(o: WireOrder): Order {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    items: (o.items ?? []).map(adaptOrderItem),
    timeline: buildTimeline(o),
    // A guest order can have no address at all; components read fields off
    // this unconditionally, so give them an empty object rather than null.
    shippingAddress: adaptShippingAddress(o),
    paymentMethod: o.paymentMethod,
    // Defaulted rather than assumed present: an order fetched from an API
    // instance that predates this field would otherwise render `undefined` in
    // the payment-status badge, and "unpaid" is the safe reading of a COD
    // order nobody has confirmed collection on.
    paymentStatus: o.paymentStatus ?? 'unpaid',
    shippingMethod: o.shippingMethod,
    subtotal: paisasToRupees(o.subtotal),
    shippingCost: paisasToRupees(o.shippingCost),
    tax: paisasToRupees(o.tax),
    discount: paisasToRupees(o.discount),
    total: paisasToRupees(o.total),
    trackingNumber: o.trackingNumber ?? undefined,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export function adaptCartItem(c: WireCartItem): CartItem {
  const v = c.variant
  return {
    id: c.id,
    productId: c.productId,
    variantId: c.variantId,
    slug: c.product?.slug ?? '',
    name: c.product?.nameEn ?? '',
    image: c.product?.images?.[0]?.url ?? '',
    tier: v.tier,
    size: v.size ?? undefined,
    color: v.color ?? undefined,
    colorHex: v.colorHex ?? undefined,
    scent: v.scent ?? undefined,
    price: paisasToRupees(v.price),
    compareAtPrice: v.compareAtPrice ? paisasToRupees(v.compareAtPrice) : undefined,
    quantity: c.quantity,
    hasGiftWrap: c.hasGiftWrap,
    giftMessage: c.giftMessage ?? undefined,
  }
}

// ─── User ─────────────────────────────────────────────────────────────────────

export function adaptUser(u: WireUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email ?? '',
    phone: u.phone ?? undefined,
    avatar: u.avatar ?? undefined,
    addresses: (u.addresses ?? []).map(adaptAddress),
    wishlistIds: (u.wishlist ?? []).map((w) => w.productId),
    loyaltyPoints: u.loyaltyPoints ?? 0,
    createdAt: u.createdAt,
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

/**
 * Shop configuration as the storefront uses it.
 *
 * Money is converted to **rupees** here, at the boundary — the API stores and
 * returns paisas. This is the same reason the adapters layer exists at all: a
 * component that divides by 100 itself is a component that will one day forget.
 */
export interface StoreSettings {
  // Shipping
  freeShippingThreshold: number
  standardShippingCost: number
  expressShippingCost: number

  // Checkout
  codFee: number
  minOrderAmount: number
  giftWrapPrice: number
  taxPercentage: number
  guestCheckoutEnabled: boolean

  // Currency
  currency: string
  currencySymbol: string

  // Payment availability
  codEnabled: boolean
  onlinePaymentEnabled: boolean
  walletPaymentEnabled: boolean

  // Store
  storeName: string
  storeEmail: string
  storePhone: string

  // Features
  maintenanceMode: boolean
  couponEnabled: boolean
}

type RawConfig = WirePublicSettings

/**
 * Readers that tolerate a missing or wrong-typed key.
 *
 * A config row can be deleted or edited to nonsense by staff at any time, and
 * the storefront must keep rendering — a shop that white-screens because
 * someone typo'd a currency symbol is worse than one showing a stale default.
 */
function num(raw: RawConfig, key: string, fallback: number): number {
  const v = raw[key]
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function bool(raw: RawConfig, key: string, fallback: boolean): boolean {
  const v = raw[key]
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v === 'true' || v === '1'
  return fallback
}

function str(raw: RawConfig, key: string, fallback: string): string {
  const v = raw[key]
  return typeof v === 'string' && v.trim() !== '' ? v : fallback
}

/**
 * Per-key fallbacks, in the API's units (paisas for money).
 *
 * **These mirror the seeded values in `apps/api/src/settings/config-catalogue.ts`.**
 * Deliberately: an unreachable settings endpoint should degrade toward what
 * the server will actually charge against, not toward a number the storefront
 * invented. The storefront once carried its own ₨5,000 free-shipping constant
 * while the API used ₨2,999, so the cart progress bar and the invoice
 * disagreed about the same order.
 */
const CONFIG_FALLBACK = {
  free_shipping_threshold: 299900,
  standard_shipping_cost: 29900,
  express_shipping_cost: 49900,
  cod_fee: 0,
  min_order_amount: 0,
  gift_wrap_price: 9900,
  tax_percentage: 0,
  currency: 'PKR',
  currency_symbol: '₨',
  store_name: 'Yala Haji',
  store_email: 'salam@yalahaji.com',
  store_phone: '+923001234567',
} as const

export function adaptSettings(raw: WirePublicSettings): StoreSettings {
  return {
    freeShippingThreshold: paisasToRupees(
      num(raw, 'free_shipping_threshold', CONFIG_FALLBACK.free_shipping_threshold),
    ),
    standardShippingCost: paisasToRupees(
      num(raw, 'standard_shipping_cost', CONFIG_FALLBACK.standard_shipping_cost),
    ),
    expressShippingCost: paisasToRupees(
      num(raw, 'express_shipping_cost', CONFIG_FALLBACK.express_shipping_cost),
    ),

    codFee: paisasToRupees(num(raw, 'cod_fee', CONFIG_FALLBACK.cod_fee)),
    minOrderAmount: paisasToRupees(num(raw, 'min_order_amount', CONFIG_FALLBACK.min_order_amount)),
    giftWrapPrice: paisasToRupees(num(raw, 'gift_wrap_price', CONFIG_FALLBACK.gift_wrap_price)),
    // A percentage, not money — must not go through paisasToRupees.
    taxPercentage: num(raw, 'tax_percentage', CONFIG_FALLBACK.tax_percentage),
    guestCheckoutEnabled: bool(raw, 'guest_checkout_enabled', true),

    currency: str(raw, 'currency', CONFIG_FALLBACK.currency),
    currencySymbol: str(raw, 'currency_symbol', CONFIG_FALLBACK.currency_symbol),

    codEnabled: bool(raw, 'cod_enabled', true),
    onlinePaymentEnabled: bool(raw, 'online_payment_enabled', false),
    walletPaymentEnabled: bool(raw, 'wallet_payment_enabled', false),

    storeName: str(raw, 'store_name', CONFIG_FALLBACK.store_name),
    storeEmail: str(raw, 'store_email', CONFIG_FALLBACK.store_email),
    storePhone: str(raw, 'store_phone', CONFIG_FALLBACK.store_phone),

    maintenanceMode: bool(raw, 'maintenance_mode', false),
    couponEnabled: bool(raw, 'coupon_enabled', true),
  }
}

/**
 * What the storefront uses when `/settings/public` cannot be reached at all.
 *
 * Derived by adapting an empty payload rather than written out by hand, so
 * there is exactly one place a default lives. The previous hand-written copy
 * of this object stated the same numbers a second time in rupees, which is
 * two places for them to drift — and drift is the whole reason this file
 * carries the warning above.
 */
export const SETTINGS_FALLBACK: StoreSettings = adaptSettings({})

// ─── Menus ────────────────────────────────────────────────────────────────────

/**
 * Route shape per link type. The API stores *what* an item points at; this is
 * the only place that decides *where* that is on the storefront.
 *
 * Keeping it here rather than in each nav component is the same reasoning as
 * `getDefaultVariant` and `adaptImages`: five surfaces render menu items, and
 * "which route does a `collection` go to" has to be one answer. The five that
 * previously answered "which variant represents this product" independently
 * disagreed, and that shipped a card advertising ₨1,199 that opened at ₨4,999.
 */
const MENU_ROUTES: Record<string, (slug: string) => string> = {
  category: (slug) => `/shop/${slug}`,
  product: (slug) => `/products/${slug}`,
  // CMS pages are top-level routes (`/about`, `/terms`, `/shipping`), not
  // nested under a `/pages` segment — there is no such segment.
  cms_page: (slug) => `/${slug}`,
  // No `/brands` or `/collections` route exists in this app. Both land on the
  // catalogue carrying the filter as a query parameter, which is where they
  // will keep working unchanged once the shop page reads its own filters from
  // the URL. See TASKS.md — the shop page ignores query parameters entirely
  // today, which is why the pre-existing `?filter=sale` header link also does
  // nothing beyond opening /shop.
  brand: (slug) => `/shop?brand=${encodeURIComponent(slug)}`,
  collection: (slug) => `/shop?collection=${encodeURIComponent(slug)}`,
}

/**
 * Rejects a stored path that is not actually internal.
 *
 * The rule itself lives in `lib/menu-constants.ts`, which mirrors the API's
 * copy exactly — an ad-hoc `startsWith('/') && !startsWith('//')` here would
 * be weaker than the rule the API enforces on write (it accepts `/\evil.example`
 * and `/a b`), which is the drift the mirror exists to prevent.
 *
 * Re-checking at all is deliberate: the adapter is the boundary components
 * trust, and a row can predate a check.
 */
function isSafeInternalPath(path: string): boolean {
  return INTERNAL_PATH_REGEX.test(path)
}

function isSafeExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/**
 * `rel` for one item.
 *
 * `noopener noreferrer` is not decoration on a new-tab external link: without
 * `noopener` the opened page gets a live `window.opener` handle back into
 * this one and can navigate it somewhere else. Returning `undefined` rather
 * than `''` matters too — React omits the attribute entirely for `undefined`,
 * where an empty string emits `rel=""` on every anchor in the header.
 */
function menuRel(item: WireMenuItem, isExternal: boolean): string | undefined {
  const tokens = new Set<string>()

  if (item.noFollow) tokens.add('nofollow')
  if (item.relAttribute) {
    for (const token of item.relAttribute.split(/\s+/)) {
      if (token) tokens.add(token)
    }
  }
  if (isExternal && item.openInNewTab) {
    tokens.add('noopener')
    tokens.add('noreferrer')
  }

  return tokens.size ? [...tokens].join(' ') : undefined
}

/**
 * `en` is the fallback for a missing translation, exactly as `localised` does.
 *
 * The emptiness check is against **all three** locales, not just English. A
 * badge an admin translated only into Urdu is still a badge — gating on `en`
 * alone dropped it in every locale, Urdu included, which is precisely
 * backwards for a shop whose customers are largely Urdu-speaking.
 */
function menuText(text: WireMenuText | null): Record<Locale, string> | undefined {
  if (!text) return undefined
  const base = text.en || text.ur || text.ar
  if (!base) return undefined
  return localised(base, text.ur, text.ar)
}

const MEGA_LAYOUTS: MegaMenuLayout[] = [
  'columns',
  'columns_with_banner',
  'featured_grid',
  'columns_with_products',
]

function adaptMegaConfig(config: WireMegaConfig | null): MegaConfig | undefined {
  if (!config) return undefined
  return {
    featuredCategorySlugs: config.featuredCategorySlugs ?? [],
    featuredProductSlugs: config.featuredProductSlugs ?? [],
    banner: config.banner
      ? {
          image: config.banner.image,
          href: config.banner.href,
          heading: menuText(config.banner.heading) ?? null,
          subheading: menuText(config.banner.subheading) ?? null,
        }
      : null,
    blocks: (config.blocks ?? []).map((block) => ({
      type: block.type,
      heading: menuText(block.heading) ?? null,
      body: menuText(block.body) ?? null,
      image: block.image,
      links: (block.links ?? []).map((l) => ({
        label: localised(l.label.en, l.label.ur, l.label.ar),
        href: l.href,
      })),
    })),
  }
}

/**
 * One menu item, with its href resolved for `locale`.
 *
 * Returns `null` for an item that cannot produce a usable destination — a
 * `category` row saved with no slug, a `custom` row holding
 * `javascript:alert(1)`. Dropping it is deliberate: `NavLink` would otherwise
 * render an anchor to `/shop/undefined`, and a dead control in the header is
 * worse than one link fewer. Children are adapted first so a heading whose
 * children all dropped disappears with them.
 */
export function adaptMenuItem(
  item: WireMenuItem,
  locale: Locale,
  depth = 0,
): MenuItem | null {
  // The API caps nesting too, and assembles the tree with its own cycle guard
  // — but this function recurses over a payload, and a payload is just JSON
  // that arrived over a network. A cap here is what stops a malformed or
  // hand-crafted response blowing the stack inside a server render, which the
  // browser reports as "a client-side exception has occurred" rather than as
  // bad data.
  if (depth > MAX_MENU_DEPTH) return null

  const children = (item.children ?? [])
    .map((child) => adaptMenuItem(child, locale, depth + 1))
    .filter((child): child is MenuItem => child !== null)

  const prefix = `/${locale}`
  let href: string | null = null
  let isExternal = false

  if (item.linkType === 'heading') {
    // A heading with nothing under it is an empty column title.
    if (children.length === 0) return null
  } else if (item.linkType === 'external') {
    if (!item.url || !isSafeExternalUrl(item.url)) return null
    href = item.url
    isExternal = true
  } else if (item.linkType === 'custom') {
    if (!item.url || !isSafeInternalPath(item.url)) return null
    href = `${prefix}${item.url}`
  } else {
    const route = MENU_ROUTES[item.linkType]
    if (!route || !item.targetSlug) return null
    href = `${prefix}${route(item.targetSlug)}`
  }

  const megaLayout = MEGA_LAYOUTS.includes(item.megaLayout as MegaMenuLayout)
    ? (item.megaLayout as MegaMenuLayout)
    : undefined

  return {
    id: item.id,
    title: localised(item.title.en, item.title.ur, item.title.ar),
    linkType: item.linkType as MenuItem['linkType'],
    href,
    isExternal,
    icon: item.icon ?? undefined,
    image: item.image ?? undefined,
    badge: menuText(item.badge),
    device: (item.device === 'desktop' || item.device === 'mobile' ? item.device : 'all'),
    rel: menuRel(item, isExternal),
    openInNewTab: item.openInNewTab,
    titleAttr: menuText(item.titleAttr),
    // A mega panel with no children and no config is an empty white box under
    // the nav — render it as an ordinary link instead.
    isMegaMenu: item.isMegaMenu && (children.length > 0 || !!item.megaConfig),
    megaLayout,
    megaColumns: item.megaColumns > 0 ? item.megaColumns : 4,
    megaConfig: adaptMegaConfig(item.megaConfig),
    children,
  }
}

export function adaptMenu(menu: WireMenu, locale: Locale): Menu {
  return {
    id: menu.id,
    location: menu.location as Menu['location'],
    cacheTtl: menu.cacheTtl > 0 ? menu.cacheTtl : 300,
    items: (menu.items ?? [])
      .map((item) => adaptMenuItem(item, locale))
      .filter((item): item is MenuItem => item !== null),
  }
}
