// ─────────────────────────────────────────────────────────────
// Shared types — mirror the Prisma schema in apps/api
// Money is stored in PAISAS (integer) everywhere on the wire.
// ─────────────────────────────────────────────────────────────

export type Role = 'customer' | 'admin' | 'manager' | 'support' | 'fulfillment'

export type Tier = 'Economy' | 'Standard' | 'Premium'

// Mirrors the Prisma `OrderStatus` enum exactly. `refunded` is the terminal
// state; there is no `returned` order status — a physical return lives in the
// Return model, and the order moves to `refunded` when its refund is issued.
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

export type PaymentMethod = 'cod' | 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'card'

export type PaymentStatus = 'unpaid' | 'paid' | 'partially_refunded' | 'refunded'

// Mirrors the Prisma `ShippingMethod` enum: standard | express | cod.
export type ShippingMethod = 'standard' | 'express' | 'cod'

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'refunded'

/**
 * Staff profile returned by /auth/admin/login and /auth/admin/me.
 * There is no token field — the session is an httpOnly cookie.
 */
export interface AdminProfile {
  id: string
  name: string
  email: string | null
  phone: string
  role: Role
  avatar: string | null
  lastLoginAt?: string | null
  createdAt?: string
}

export interface AdminLoginResponse {
  user: AdminProfile
  expiresAt: string
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

/**
 * A photo as the product form holds it: no `id`, because the API replaces the
 * whole media list on save rather than diffing it, and no `order`, because
 * position in the array is the order — carrying a second copy of that is how
 * the two drift apart.
 */
export interface MediaInput {
  url: string
  alt?: string
  isPrimary?: boolean
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
  images?: MediaInput[]
}

/**
 * A line as the API returns it. The money fields the row carries are `price`
 * (unit, paisas) and `quantity` — there is **no** `total` column, so a line
 * total is `price × quantity`, computed at the display edge. `name`/`image`
 * are snapshots taken at checkout, so a line still renders after the product
 * is renamed or deleted; `product`/`variant` are live joins and may be absent.
 */
export interface OrderItem {
  id: string
  productId: string
  variantId: string
  name: string
  image?: string | null
  tier: Tier
  size?: string | null
  color?: string | null
  scent?: string | null
  price: number
  quantity: number
  hasGiftWrap?: boolean
  giftMessage?: string | null
  product?: { slug: string; nameEn: string } | null
  variant?: ProductVariant | null
}

export interface OrderTimelineEntry {
  id: string
  status: OrderStatus
  note?: string | null
  createdAt: string
}

/**
 * The address exactly as the API returns it (the raw Prisma `Address`). The
 * field names are `fullName`/`addressLine1`/`addressLine2` — NOT
 * `name`/`line1`/`line2`. Getting these wrong renders a blank shipping block,
 * which is precisely the bug this type once caused.
 */
export interface OrderAddress {
  id: string
  label?: string
  fullName: string
  phone: string
  addressLine1: string
  addressLine2?: string | null
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
  todayOrders: number
  refundedOrders: number
  /** Fraction 0–1; format as a percentage for display. */
  refundRate: number
  byStatus: { status: OrderStatus; count: number }[]
}

export interface ReturnOrderItem {
  id: string
  name: string
  quantity: number
  price: number
  image?: string | null
}

/** A return request as the admin queue receives it. */
export interface ReturnRequest {
  id: string
  reason: string
  status: ReturnStatus
  note?: string | null
  images?: string | null
  createdAt: string
  updatedAt: string
  order: {
    id: string
    number: string
    total: number
    status: OrderStatus
    createdAt: string
    items: ReturnOrderItem[]
  }
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
