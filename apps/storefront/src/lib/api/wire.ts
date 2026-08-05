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

import type { Tier, OrderStatus, PaymentMethod, ShippingMethod } from '@/types'

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
  fullName: string
  phone: string
  addressLine1: string
  addressLine2: string | null
  city: string
  province: string
  postalCode: string | null
  isDefault: boolean
}

export interface WireOrderItem {
  id: string
  productId: string
  variantId: string
  name: string
  image: string | null
  tier: Tier
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

export interface WirePublicSettings {
  /** paisas */
  freeShippingThreshold: number
  standardShippingCost: number
  expressShippingCost: number
  codFee: number
  currency: string
}
