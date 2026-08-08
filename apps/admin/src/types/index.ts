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
  nameUr: string
  nameAr: string
  descEn?: string
  descUr?: string
  descAr?: string
  image?: string | null
  bannerImage?: string | null
  parentId: string | null
  order: number
  featured: boolean
  isActive: boolean
  seoTitleEn?: string | null
  seoTitleUr?: string | null
  seoTitleAr?: string | null
  seoDescEn?: string | null
  seoDescUr?: string | null
  seoDescAr?: string | null
  createdAt?: string
  updatedAt?: string
  /** Only present on the admin tree (`GET /categories/admin/tree`). */
  productCount?: number
  children?: Category[]
}

/** Payload for `POST /categories` and `PATCH /categories/:id`. */
export interface CategoryInput {
  slug: string
  nameEn: string
  nameUr: string
  nameAr: string
  descEn?: string
  descUr?: string
  descAr?: string
  image?: string
  bannerImage?: string
  parentId?: string | null
  order?: number
  featured?: boolean
  isActive?: boolean
  seoTitleEn?: string
  seoTitleUr?: string
  seoTitleAr?: string
  seoDescEn?: string
  seoDescUr?: string
  seoDescAr?: string
}

/** One row's new position after a drag-and-drop move — mirrors ReorderItemDto. */
export interface ReorderCategoryItem {
  id: string
  parentId: string | null
  order: number
}

export interface BulkCategoryResult {
  requested: number
  updated: number
  skipped: { id: string; name: string; reason: string }[]
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
  // Nullable, not merely optional: an omitted key means "leave alone" and null
  // means "clear it". See create-product.dto.ts for why the difference matters.
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
  email?: string | null
  addressLine1: string
  addressLine2?: string | null
  area?: string | null
  city: string
  province?: string | null
  country?: string | null
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

  /**
   * The delivery address as it stood when the order was placed.
   *
   * This — not `address` — is what the order screen must render. `address`
   * points at a row the customer can still edit or delete, so reading it meant
   * a customer moving house rewrote the recorded destination of every order
   * they had ever placed, including delivered ones a dispute might turn on.
   *
   * Nullable only because the columns were added to a populated table; the
   * `20260807100000_order_address_snapshot` migration backfills every row.
   */
  shippingLabel?: string | null
  shippingFullName?: string | null
  shippingPhone?: string | null
  shippingEmail?: string | null
  shippingAddressLine1?: string | null
  shippingAddressLine2?: string | null
  shippingArea?: string | null
  shippingCountry?: string | null
  shippingCity?: string | null
  shippingProvince?: string | null
  shippingPostalCode?: string | null

  /** Which saved address was chosen. Provenance only — never for display. */
  address?: OrderAddress | null
  coupon?: { code: string; type: string; value: number } | null
  items: OrderItem[]
  timeline: OrderTimelineEntry[]
  /**
   * The physical-return lifecycle for this order — "Return" as its own status,
   * distinct from `status` (fulfilment) and `paymentStatus` (money). Usually
   * zero or one entry; the API refuses a second open request per order, but
   * a rejected one can be followed by a fresh request, hence an array.
   */
  returns: OrderReturn[]
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

/**
 * A return row as it comes back nested on an `Order` (`GET /orders/admin/:id`).
 * Unlike `ReturnRequest` (the admin queue's own shape) this carries no nested
 * `order` — the order is already the parent context, so the API's plain
 * `returns: true` include returns just the row's own columns.
 */
export interface OrderReturn {
  id: string
  orderId: string
  reason: string
  status: ReturnStatus
  note?: string | null
  images?: string | null
  createdAt: string
  updatedAt: string
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

// ─── Store settings ─────────────────────────────────────────────

export type ConfigValueType = 'string' | 'number' | 'boolean' | 'json'

/**
 * A row from the `settings` table. `value` is always the raw string as
 * stored — `valueType` says how to read it. Mirrors `Setting` in
 * apps/api/prisma/schema.prisma.
 */
export interface Setting {
  key: string
  value: string
  valueType: ConfigValueType
  category: string
  description: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface SettingInput {
  key: string
  value: string
  valueType: ConfigValueType
  category?: string
  description?: string
  isPublic?: boolean
}

// ─── Audit log ───────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  actorId: string
  actorName: string
  actorRole: string
  action: 'create' | 'update' | 'delete'
  entityType: string
  entityId: string
  before: unknown
  after: unknown
  ipAddress: string | null
  createdAt: string
}

// ─── Navigation menus ─────────────────────────────────────────
//
// Mirrors the Prisma models in `apps/api/prisma/schema.prisma`. The admin and
// API shapes are intentional mirrors, the same rule the OrderStatus/address
// field names already follow — a drift here previously shipped a blank
// shipping block and an unreachable status.

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

/** Free-form panel content. The API normalises whatever is stored here on read. */
export interface MegaConfig {
  featuredCategorySlugs?: string[]
  featuredProductSlugs?: string[]
  banner?: {
    image: string
    href?: string | null
    heading?: { en: string; ur?: string | null; ar?: string | null } | null
    subheading?: { en: string; ur?: string | null; ar?: string | null } | null
  } | null
  blocks?: Array<{
    type: 'text' | 'image' | 'links'
    heading?: { en: string; ur?: string | null; ar?: string | null } | null
    body?: { en: string; ur?: string | null; ar?: string | null } | null
    image?: string | null
    links?: Array<{ label: { en: string; ur?: string | null; ar?: string | null }; href: string }>
  }>
}

export interface Menu {
  id: string
  location: MenuLocation
  name: string
  isActive: boolean
  cacheTtl: number
  createdAt?: string
  updatedAt?: string
  /** Only on `GET /menus/admin`. */
  itemCount?: number
}

/**
 * A node of `GET /menus/admin/:id/tree`.
 *
 * The admin tree is the *unfiltered* one — every status, every audience, every
 * schedule — deliberately a different endpoint from the public read rather than
 * an `includeHidden` flag on it, because the public route carries no guard.
 */
export interface MenuItem {
  id: string
  title: { en: string; ur: string | null; ar: string | null }
  linkType: MenuLinkType
  targetSlug: string | null
  url: string | null
  icon: string | null
  image: string | null
  badge: { en: string; ur: string | null; ar: string | null } | null
  order: number
  device: MenuDevice
  visibility: MenuVisibility
  isMegaMenu: boolean
  megaLayout: MegaMenuLayout | null
  megaColumns: number
  megaConfig: MegaConfig | null
  relAttribute: string | null
  noFollow: boolean
  openInNewTab: boolean
  titleAttr: { en: string; ur: string | null; ar: string | null } | null
  children: MenuItem[]

  // ── Admin-only fields ──────────────────────────────────────
  //
  // `GET /menus/admin/:id/tree` returns these; the public reads deliberately
  // do not — they are the fields the public read exists to *apply and then
  // discard*, so publishing them would leak the existence and timing of
  // navigation staff have not released yet.
  //
  // Declared required rather than optional so reading one is type-checked. The
  // earlier optional-plus-inline-cast version compiled either way, which meant
  // a typo in a cast would have read `undefined` in silence.
  parentId: string | null
  isActive: boolean
  targetId: string | null
  /** ISO strings — the column is a DateTime and JSON has no date type. */
  publishFrom: string | null
  publishUntil: string | null
}

/**
 * Payload for `POST /menus/admin/items` and `PATCH /menus/admin/items/:id`.
 *
 * **Every optional field is `| null` on purpose.** In a PATCH, omitting a key
 * means "leave this alone" and sending `null` means "clear it" — two different
 * instructions the API deliberately distinguishes. Typing these as `string`
 * only would let a form map a cleared input to `undefined`, which reads as
 * "leave alone": the admin clears the badge, saves, and the badge is still
 * there. `@IsOptional()` skips every other validator for `null`, so a null is
 * always accepted.
 */
export interface MenuItemInput {
  menuId?: string
  parentId?: string | null
  titleEn: string
  titleUr?: string | null
  titleAr?: string | null
  linkType: MenuLinkType
  targetSlug?: string | null
  targetId?: string | null
  url?: string | null
  icon?: string | null
  image?: string | null
  badgeEn?: string | null
  badgeUr?: string | null
  badgeAr?: string | null
  order?: number
  isActive?: boolean
  visibility?: MenuVisibility
  device?: MenuDevice
  publishFrom?: string | null
  publishUntil?: string | null
  isMegaMenu?: boolean
  megaLayout?: MegaMenuLayout | null
  megaColumns?: number
  megaConfig?: MegaConfig | null
  relAttribute?: string | null
  noFollow?: boolean
  openInNewTab?: boolean
  titleAttrEn?: string | null
  titleAttrUr?: string | null
  titleAttrAr?: string | null
}

/**
 * What `POST`/`PATCH /menus/admin/items` actually return — the flat Prisma
 * row, not the nested tree node.
 *
 * A separate type rather than reusing `MenuItem`: the two disagree on almost
 * every field (`titleEn` vs `title.en`, no `children`), and typing the
 * mutation as `MenuItem` was a trap waiting for the first caller that read the
 * result.
 */
export interface MenuItemRow {
  id: string
  menuId: string
  parentId: string | null
  titleEn: string
  linkType: MenuLinkType
  order: number
  isActive: boolean
}

export interface MenuInput {
  location: MenuLocation
  name: string
  isActive?: boolean
  cacheTtl?: number
}

export interface ReorderMenuItem {
  id: string
  parentId: string | null
  order: number
}
