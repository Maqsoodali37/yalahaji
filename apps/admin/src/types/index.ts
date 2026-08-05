// ─────────────────────────────────────────────────────────────
// Shared types — mirror the Prisma schema in apps/api
// Money is stored in PAISAS (integer) everywhere on the wire.
// ─────────────────────────────────────────────────────────────

export type Role = 'customer' | 'admin' | 'manager' | 'support' | 'fulfillment'

export type Tier = 'Economy' | 'Standard' | 'Premium'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'

export type PaymentMethod = 'cod' | 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'card'

export type PaymentStatus = 'unpaid' | 'paid' | 'partially_refunded' | 'refunded'

export type ShippingMethod = 'standard' | 'express' | 'pickup'

export interface AuthUser {
  id: string
  name: string
  email: string | null
  phone: string
  role: Role
  loyaltyPoints: number
  avatar: string | null
  createdAt: string
}

/** POST /auth/login response — the user must be fetched separately via /auth/me. */
export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface Paginated<T> {
  items: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface Category {
  id: string
  slug: string
  nameEn: string
  nameUr?: string
  nameAr?: string
  parentId?: string | null
  children?: Category[]
}

export interface ProductVariant {
  id: string
  productId: string
  sku: string
  tier: Tier
  size?: string | null
  color?: string | null
  colorHex?: string | null
  scent?: string | null
  price: number
  compareAtPrice?: number | null
  stock: number
  lowStockThreshold: number
  isActive: boolean
}

export interface ProductImage {
  id: string
  url: string
  alt?: string | null
  isPrimary: boolean
  order: number
}

export interface Product {
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
  isActive: boolean
  isFeatured: boolean
  metaTitle?: string | null
  metaDesc?: string | null
  createdAt: string
  updatedAt: string
  category: { id: string; slug: string; nameEn: string }
  variants: ProductVariant[]
  images: ProductImage[]
  badges: { id: string; badge: string }[]
  tags: { id: string; tag: string }[]
}

export interface VariantInput {
  sku: string
  tier: Tier
  size?: string
  color?: string
  colorHex?: string
  scent?: string
  price: number
  compareAtPrice?: number
  stock: number
  lowStockThreshold?: number
}

export interface ProductInput {
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
  categoryId: string
  isKit?: boolean
  hasGiftWrap?: boolean
  hasPreOrder?: boolean
  isFeatured?: boolean
  metaTitle?: string
  metaDesc?: string
  badges?: string[]
  tags?: string[]
  variants?: VariantInput[]
}

export interface OrderItem {
  id: string
  productId: string
  variantId: string
  quantity: number
  price: number
  total: number
  product: { slug: string; nameEn: string }
  variant: ProductVariant
}

export interface OrderTimelineEntry {
  id: string
  status: OrderStatus
  note?: string | null
  createdAt: string
}

export interface OrderAddress {
  id: string
  name: string
  phone: string
  line1: string
  line2?: string | null
  city: string
  province?: string | null
  postalCode?: string | null
}

export interface Order {
  id: string
  number: string
  userId?: string | null
  guestEmail?: string | null
  guestPhone?: string | null
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  shippingMethod: ShippingMethod
  subtotal: number
  shippingCost: number
  discount: number
  tax: number
  total: number
  trackingNumber?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; name: string; phone: string; email: string | null } | null
  address?: OrderAddress | null
  coupon?: { code: string; type: string; value: number } | null
  items: OrderItem[]
  timeline: OrderTimelineEntry[]
}

export interface OrderStats {
  periodDays: number
  totalOrders: number
  totalRevenue: number
  recentOrders: number
  recentRevenue: number
  averageOrderValue: number
  byStatus: { status: OrderStatus; count: number }[]
}

export interface CatalogueStats {
  productCount: number
  activeCount: number
  inactiveCount: number
  lowStockCount: number
  outOfStockCount: number
}

export interface LowStockVariant extends ProductVariant {
  product: { id: string; slug: string; nameEn: string }
}
