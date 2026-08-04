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

export interface OrderTimeline {
  status: OrderStatus
  label: string
  timestamp?: string
  completed: boolean
}

export interface Address {
  id: string
  label: string
  fullName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  province: string
  postalCode?: string
  isDefault: boolean
}

export interface Order {
  id: string
  number: string
  status: OrderStatus
  items: CartItem[]
  timeline: OrderTimeline[]
  shippingAddress: Address
  paymentMethod: PaymentMethod
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
