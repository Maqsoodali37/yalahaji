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

import type {
  Product, ProductVariant, ProductImage, Category, Review, BlogPost,
  BlogCategory, Order, OrderTimeline, OrderStatus, Address, User,
  CartItem, Locale, SizeGuideEntry, KitItem,
} from '@/types'
import type {
  WireProduct, WireVariant, WireProductMedia, WireCategory, WireReview,
  WireBlogPost, WireOrder, WireOrderItem, WireAddress, WireUser,
  WireCartItem, WireSizeGuideEntry, WireKitContent, WirePublicSettings,
} from './wire'

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
    images: (p.images ?? []).map((m) => adaptImage(m, name.en)),
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
    fullName: a.fullName,
    phone: a.phone,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2 ?? undefined,
    city: a.city,
    province: a.province,
    postalCode: a.postalCode ?? undefined,
    isDefault: a.isDefault,
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

const EMPTY_ADDRESS: Address = {
  id: '', label: '', fullName: '', phone: '',
  addressLine1: '', city: '', province: '', isDefault: false,
}

export function adaptOrder(o: WireOrder): Order {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    items: (o.items ?? []).map(adaptOrderItem),
    timeline: buildTimeline(o),
    // A guest order can have no address row; components read fields off this
    // unconditionally, so give them an empty object rather than null.
    shippingAddress: o.address ? adaptAddress(o.address) : EMPTY_ADDRESS,
    paymentMethod: o.paymentMethod,
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

export interface StoreSettings {
  freeShippingThreshold: number
  standardShippingCost: number
  expressShippingCost: number
  codFee: number
  currency: string
}

export function adaptSettings(s: WirePublicSettings): StoreSettings {
  return {
    freeShippingThreshold: paisasToRupees(s.freeShippingThreshold),
    standardShippingCost: paisasToRupees(s.standardShippingCost),
    expressShippingCost: paisasToRupees(s.expressShippingCost),
    codFee: paisasToRupees(s.codFee),
    currency: s.currency ?? '₨',
  }
}
