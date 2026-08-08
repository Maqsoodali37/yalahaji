// ─── Locale ───────────────────────────────────────────────────────────────────
export type Locale = 'en' | 'ur' | 'ar'

// ─── Tier ─────────────────────────────────────────────────────────────────────
export type Tier = 'Economy' | 'Standard' | 'Premium'

// ─── Category ─────────────────────────────────────────────────────────────────
export interface Category {
  id: string
  slug: string
  name: Record<Locale, string>
  description: Record<Locale, string>
  image: string
  icon?: string
  parentId?: string
  children?: Category[]
  productCount: number
  featured: boolean
  order: number
}

// ─── Product ──────────────────────────────────────────────────────────────────
export interface ProductImage {
  id: string
  url: string
  alt: string
  isPrimary: boolean
}

export interface ProductVariant {
  id: string
  sku: string
  tier: Tier
  size?: string
  color?: string
  colorHex?: string
  scent?: string
  price: number
  compareAtPrice?: number
  stock: number
  lowStockThreshold: number
}

export interface KitItem {
  productId: string
  productName: Record<Locale, string>
  quantity: number
  image: string
  tier: Tier
}

export interface SizeGuideEntry {
  label: string
  chest?: string
  length?: string
  waist?: string
  fit?: string
  fabric?: string
}

export interface Product {
  id: string
  slug: string
  sku: string
  name: Record<Locale, string>
  description: Record<Locale, string>
  shortDescription: Record<Locale, string>
  categoryId: string
  categorySlug: string
  images: ProductImage[]
  variants: ProductVariant[]
  tags: string[]
  badges: Array<'new' | 'hot' | 'sale' | 'bestseller' | 'limited'>
  isKit: boolean
  kitContents?: KitItem[]
  hasGiftWrap: boolean
  hasPreOrder: boolean
  sizeGuide?: SizeGuideEntry[]
  avgRating: number
  reviewCount: number
  soldCount: number
  createdAt: string
  updatedAt: string
}

// ─── Review ───────────────────────────────────────────────────────────────────
export interface Review {
  id: string
  productId: string
  author: string
  avatar?: string
  rating: number
  title: string
  body: string
  images?: string[]
  videoUrl?: string
  verified: boolean
  helpful: number
  createdAt: string
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export interface CartItem {
  id: string // cartItemId (uuid)
  productId: string
  variantId: string
  slug: string
  name: string
  image: string
  tier: Tier
  /** Only populated on order lines — the live cart does not carry it. */
  sku?: string
  size?: string
  color?: string
  colorHex?: string
  scent?: string
  price: number
  compareAtPrice?: number
  quantity: number
  hasGiftWrap: boolean
  giftMessage?: string
}

export interface Cart {
  items: CartItem[]
  couponCode?: string
  couponDiscount: number
  subtotal: number
  shipping: number
  tax: number
  total: number
  freeShippingThreshold: number
}

// ─── Order ────────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type PaymentMethod =
  | 'jazzcash'
  | 'easypaisa'
  | 'bank_transfer'
  | 'card'
  | 'cod'

export type ShippingMethod = 'standard' | 'express' | 'cod'

/**
 * Mirrors the Prisma `PaymentStatus` enum. Distinct from `OrderStatus`: a COD
 * order is `delivered` and `unpaid` for the moment between handing the parcel
 * over and the courier remitting the cash, and the two were previously
 * conflated on screen.
 */
export type PaymentStatus = 'unpaid' | 'paid' | 'partially_refunded' | 'refunded'

export interface OrderTimeline {
  status: OrderStatus
  label: string
  timestamp?: string
  completed: boolean
}

/**
 * The chips the address book offers.
 *
 * `Address.label` stays a plain `string`, deliberately: rows predating this
 * hold whatever was typed ("Warehouse", "Ammi's house"), and narrowing the
 * field to this union would make those rows fail to typecheck on read. The
 * chips are a shortcut for the common answers, not a schema.
 *
 * "Other" is a mode rather than a value — picking it clears the label and
 * shows a text field, so it is never what gets stored.
 */
export const ADDRESS_LABELS = [
  { type: 'home', label: 'Home' },
  { type: 'office', label: 'Office' },
  { type: 'other', label: 'Other' },
] as const

export type AddressLabelType = (typeof ADDRESS_LABELS)[number]['type']

/** Shipping only for now — nothing collects a billing address while COD is
 *  the only enabled payment method. See PROJECT_SPEC.md. */
export type AddressDefaultKind = 'shipping' | 'billing'

export interface Address {
  id: string
  /** Free-text display name. Meaningful mainly when `labelType` is `other`. */
  label: string
  labelType: AddressLabelType
  fullName: string
  phone: string
  /** Optional, per-address: the recipient is not always the account holder. */
  email?: string
  addressLine1: string
  addressLine2?: string
  /** Named locality — "DHA Phase 5", "Gulberg III". */
  area?: string
  city: string
  province: string
  country: string
  postalCode?: string
  isDefaultShipping: boolean
  /** Stored and editable, but read by nothing yet — COD has no billing step. */
  isDefaultBilling: boolean
}

export interface Order {
  id: string
  number: string
  status: OrderStatus
  items: CartItem[]
  timeline: OrderTimeline[]
  shippingAddress: Address
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  shippingMethod: ShippingMethod
  subtotal: number
  shippingCost: number
  tax: number
  discount: number
  total: number
  trackingNumber?: string
  estimatedDelivery?: string
  createdAt: string
  updatedAt: string
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  addresses: Address[]
  wishlistIds: string[]
  loyaltyPoints: number
  createdAt: string
}

// ─── Blog ─────────────────────────────────────────────────────────────────────
export type BlogCategory =
  | 'hajj-guide'
  | 'umrah-guide'
  | 'packing'
  | 'dua'
  | 'travel-tips'
  | 'product-guides'

export interface BlogPost {
  id: string
  slug: string
  title: Record<Locale, string>
  excerpt: Record<Locale, string>
  body: Record<Locale, string>
  category: BlogCategory
  coverImage: string
  author: string
  authorAvatar?: string
  readingTime: number
  publishedAt: string
  featured: boolean
  tags: string[]
}

// ─── Kit Builder ──────────────────────────────────────────────────────────────
export interface KitCategory {
  id: string
  name: Record<Locale, string>
  icon: string
  required: boolean
  products: Product[]
}

export interface KitSelection {
  categoryId: string
  productId: string
  variantId: string
  quantity: number
}

// ─── Testimonial ──────────────────────────────────────────────────────────────
export interface Testimonial {
  id: string
  author: string
  location: string
  avatar?: string
  text: string
  rating: number
  type: 'text' | 'audio' | 'video'
  mediaUrl?: string
}

// ─── Navigation menus ─────────────────────────────────────────────────────────

export type MenuLocation = 'header' | 'footer' | 'mobile' | 'sidebar' | 'mega'

export type MenuLinkType =
  | 'category'
  | 'product'
  | 'cms_page'
  | 'brand'
  | 'collection'
  | 'custom'
  | 'external'
  | 'heading'

export type MenuVisibility = 'everyone' | 'guest' | 'customer' | 'wholesale' | 'retail'

export type MenuDevice = 'all' | 'desktop' | 'mobile'

export type MegaMenuLayout =
  | 'columns'
  | 'columns_with_banner'
  | 'featured_grid'
  | 'columns_with_products'

export interface MegaBanner {
  image: string
  href: string | null
  heading: Record<Locale, string> | null
  subheading: Record<Locale, string> | null
}

export interface MegaBlock {
  type: 'text' | 'image' | 'links'
  heading: Record<Locale, string> | null
  body: Record<Locale, string> | null
  image: string | null
  links: Array<{ label: Record<Locale, string>; href: string }>
}

export interface MegaConfig {
  featuredCategorySlugs: string[]
  featuredProductSlugs: string[]
  banner: MegaBanner | null
  blocks: MegaBlock[]
}

export interface MenuItem {
  id: string
  title: Record<Locale, string>
  linkType: MenuLinkType
  /**
   * Ready-to-render path, locale prefix included, or `null` for a `heading`.
   *
   * Built once in the adapter from `linkType` + slug/url — never in a
   * component. Six surfaces render menu items, and "which route does a
   * `collection` go to" is one answer, not six.
   */
  href: string | null
  /** True when `href` points off-site. Decides target/rel and the external-link icon. */
  isExternal: boolean
  icon?: string
  image?: string
  badge?: Record<Locale, string>
  device: MenuDevice
  /** Composed `rel` value, or undefined when there is nothing to emit. */
  rel?: string
  openInNewTab: boolean
  titleAttr?: Record<Locale, string>
  isMegaMenu: boolean
  megaLayout?: MegaMenuLayout
  megaColumns: number
  megaConfig?: MegaConfig
  children: MenuItem[]
}

export interface Menu {
  id: string
  location: MenuLocation
  /** Seconds. Mirrors the TTL the API reports for this menu. */
  cacheTtl: number
  items: MenuItem[]
}
