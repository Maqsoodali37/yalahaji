// Wire types — the shapes the API actually returns.
//
// These deliberately mirror the Prisma schema rather than the storefront's
// domain types in `@/types`. The two disagree in four ways, and keeping the
// disagreement explicit here is what stops it leaking into components:
//
//   1. multilingual fields are flat (`nameEn`) not nested (`name.en`)
//   2. money is in paisas, not rupees
//   3. blog categories use underscores (`hajj_guide`) not hyphens
//   4. category arrives nested, but components want a flat `categorySlug`
//
// `adapters.ts` is the only place allowed to convert between the two.

import type {
  Tier,
  AddressLabelType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingMethod,
} from '@/types'

export interface Paginated<T> {
  items: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface WireProductMedia {
  id: string
  url: string
  alt: string | null
  isPrimary: boolean
  order: number
  type?: 'image' | 'video'
}

export interface WireVariant {
  id: string
  sku: string
  tier: Tier
  size: string | null
  color: string | null
  colorHex: string | null
  scent: string | null
  /** paisas */
  price: number
  /** paisas */
  compareAtPrice: number | null
  stock: number
  lowStockThreshold: number
  isActive?: boolean
}

export interface WireSizeGuideEntry {
  id?: string
  label: string
  chest: string | null
  length: string | null
  waist: string | null
  fit: string | null
  fabric: string | null
  order?: number
}

export interface WireKitContent {
  id?: string
  quantity: number
  member: {
    id: string
    slug: string
    nameEn: string
    nameUr: string
    nameAr: string
    images?: WireProductMedia[]
  }
  tier?: Tier
}

export interface WireProduct {
  id: string
  slug: string
  sku: string
  nameEn: string
  nameUr: string
  nameAr: string
  descEn: string
  descUr: string
  descAr: string
  shortDescEn: string
  shortDescUr: string
  shortDescAr: string
  isKit: boolean
  hasGiftWrap: boolean
  hasPreOrder: boolean
  avgRating: number
  reviewCount: number
  soldCount: number
  isActive?: boolean
  isFeatured?: boolean
  metaTitle?: string | null
  metaDesc?: string | null
  seoTitleEn?: string | null
  seoTitleUr?: string | null
  seoTitleAr?: string | null
  seoDescEn?: string | null
  seoDescUr?: string | null
  seoDescAr?: string | null
  seoKeywordsEn?: string | null
  seoKeywordsUr?: string | null
  seoKeywordsAr?: string | null
  createdAt: string
  updatedAt: string
  category: { id: string; slug: string; nameEn: string } | null
  variants: WireVariant[]
  images: WireProductMedia[]
  badges: Array<{ badge: string }>
  tags: Array<{ tag: string }>
  sizeGuide?: WireSizeGuideEntry[]
  kitContents?: WireKitContent[]
}

export interface WireCategory {
  id: string
  slug: string
  nameEn: string
  nameUr: string
  nameAr: string
  descEn: string | null
  descUr: string | null
  descAr: string | null
  image: string | null
  icon: string | null
  parentId: string | null
  children?: WireCategory[]
  order: number
  isFeatured?: boolean
  featured?: boolean
  _count?: { products: number }
  productCount?: number
}

export interface WireReview {
  id: string
  productId: string
  author: string
  avatar: string | null
  rating: number
  title: string
  body: string
  images: string | null // JSON-encoded array
  videoUrl: string | null
  verified: boolean
  helpful: number
  createdAt: string
}

export interface WireBlogPost {
  id: string
  slug: string
  titleEn: string
  titleUr: string
  titleAr: string
  excerptEn: string
  excerptUr: string
  excerptAr: string
  bodyEn?: string
  bodyUr?: string
  bodyAr?: string
  category: string // hajj_guide | umrah_guide | ...
  coverImage: string | null
  author: string
  authorAvatar: string | null
  readingTime: number
  publishedAt: string | null
  featured: boolean
  published?: boolean
  tags?: Array<{ tag: string }>
}

export interface WireAddress {
  id: string
  label: string | null
  // The four fields below are optional because an API instance predating the
  // address migration omits them entirely, and the storefront and API deploy
  // separately. `adapters.ts` supplies the fallbacks; declaring them required
  // here would make those `??` branches look like dead code and invite their
  // removal, which is when a rolling deploy starts rendering blank countries.
  labelType?: AddressLabelType
  fullName: string
  phone: string
  email: string | null
  addressLine1: string
  addressLine2: string | null
  area: string | null
  city: string
  province: string
  country?: string
  postalCode: string | null
  isDefaultShipping?: boolean
  isDefaultBilling?: boolean
}

export interface WireOrderItem {
  id: string
  productId: string
  variantId: string
  name: string
  image: string | null
  tier: Tier
  /** Present via the `variant` relation; the order row itself has no SKU. */
  variant?: { sku: string }
  size: string | null
  color: string | null
  scent: string | null
  /** paisas */
  price: number
  quantity: number
  hasGiftWrap: boolean
  giftMessage: string | null
  product?: { slug: string; nameEn: string }
}

export interface WireOrderTimeline {
  id?: string
  status: OrderStatus
  note: string | null
  createdAt: string
}

export interface WireOrder {
  id: string
  number: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  shippingMethod: ShippingMethod
  /** paisas */
  subtotal: number
  shippingCost: number
  discount: number
  tax: number
  total: number
  trackingNumber: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  items: WireOrderItem[]
  timeline: WireOrderTimeline[]

  /**
   * The delivery address as it stood when the order was placed.
   *
   * This — not `address` — is what the storefront renders. `address` points at
   * a row the customer can still edit or delete, so reading it made a saved
   * address change rewrite the delivery address on orders that had already
   * shipped. Nullable only because the columns were added to a populated
   * table; the migration backfills every existing row.
   */
  shippingLabel: string | null
  shippingFullName: string | null
  shippingPhone: string | null
  shippingEmail: string | null
  shippingAddressLine1: string | null
  shippingAddressLine2: string | null
  shippingArea: string | null
  shippingCountry: string | null
  shippingCity: string | null
  shippingProvince: string | null
  shippingPostalCode: string | null

  /** Kept for provenance — which saved address was chosen. Not for display. */
  address: WireAddress | null
}

export interface WireCartItem {
  id: string
  productId: string
  variantId: string
  quantity: number
  hasGiftWrap: boolean
  giftMessage: string | null
  variant: WireVariant
  product: {
    id: string
    slug: string
    nameEn: string
    nameUr: string
    nameAr: string
    images: WireProductMedia[]
  }
}

export interface WireUser {
  id: string
  name: string
  email: string | null
  phone: string
  avatar?: string | null
  loyaltyPoints?: number
  role?: string
  createdAt: string
  addresses?: WireAddress[]
  wishlist?: Array<{ productId: string }>
}

export interface WireAuthResponse {
  accessToken?: string
  access_token?: string
  token?: string
  user: WireUser
}

export interface WireCouponValidation {
  valid: boolean
  /** paisas */
  discount: number
  code?: string
  type?: 'percentage' | 'fixed'
  value?: number
  message?: string
}

/**
 * `GET /settings/public` returns a flat `{ config_key: parsedValue }` map of
 * every row flagged `is_public` — not a fixed object. Adding a config to the
 * storefront is now an UPDATE on that row rather than a change to this type,
 * so this is deliberately open-ended.
 *
 * Values arrive already coerced to the row's declared `value_type`, so a
 * `number` config is a number here and not a numeric string.
 */
export type WirePublicSettings = Record<string, string | number | boolean | null>


// ─── Menus ────────────────────────────────────────────────────────────────────
//
// A fifth mismatch the adapters absorb, on top of the four listed at the top
// of this file: the API returns *what a menu item points at* (`linkType` plus
// a slug or a URL), and components need *a href*. Route shapes and the locale
// prefix are storefront facts the API has no business knowing, so building
// one is `adaptMenuItem`'s job and nowhere else's.

export interface WireMenuText {
  en: string
  ur: string | null
  ar: string | null
}

export interface WireMegaBanner {
  image: string
  href: string | null
  heading: WireMenuText | null
  subheading: WireMenuText | null
}

export interface WireMegaBlock {
  type: 'text' | 'image' | 'links'
  heading: WireMenuText | null
  body: WireMenuText | null
  image: string | null
  links: Array<{ label: WireMenuText; href: string }>
}

export interface WireMegaConfig {
  featuredCategorySlugs: string[]
  featuredProductSlugs: string[]
  banner: WireMegaBanner | null
  blocks: WireMegaBlock[]
}

export interface WireMenuItem {
  id: string
  title: WireMenuText
  linkType: string
  targetSlug: string | null
  url: string | null
  icon: string | null
  image: string | null
  badge: WireMenuText | null
  order: number
  device: string
  visibility: string
  isMegaMenu: boolean
  megaLayout: string | null
  megaColumns: number
  megaConfig: WireMegaConfig | null
  relAttribute: string | null
  noFollow: boolean
  openInNewTab: boolean
  titleAttr: WireMenuText | null
  children: WireMenuItem[]
}

export interface WireMenu {
  id: string
  location: string
  name: string
  cacheTtl: number
  updatedAt: string
  items: WireMenuItem[]
}
