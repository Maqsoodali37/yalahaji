import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { randomInt } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { OrderStatus, PaymentStatus, Prisma, Tier } from '@prisma/client'

/**
 * Crockford Base32 — `I`, `L`, `O` and `U` are absent so a customer reading a
 * number off a WhatsApp message cannot confuse it with `1`, `0` or misread it
 * as a word.
 */
const TOKEN_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const ORDER_TOKEN_LENGTH = 6

/**
 * The unguessable half of an order number.
 *
 * The sequence (`1001`, `1002`, …) is what operations and support read, but it
 * is trivially walkable, so it cannot be what protects the order. Tracking is
 * by number alone, which makes this token the entire credential — hence
 * `crypto.randomInt` rather than `Math.random`, whose output is predictable
 * from a handful of observed values.
 *
 * 32^6 ≈ 1.07e9 combinations against a 10-per-minute throttle: roughly two
 * thousand years of guessing for one hit.
 */
function randomOrderToken(): string {
  let out = ''
  for (let i = 0; i < ORDER_TOKEN_LENGTH; i++) {
    out += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)]
  }
  return out
}

const ORDER_INCLUDE = {
  items: {
    include: {
      product: { select: { slug: true, nameEn: true } },
      variant: true,
    },
  },
  address: true,
  user: { select: { id: true, name: true, phone: true, email: true } },
  coupon: { select: { code: true, type: true, value: true } },
  timeline: { orderBy: { createdAt: 'desc' as const } },
  returns: true,
}

/**
 * Legal order-status transitions, enforced server-side.
 *
 * The admin UI already narrows the options it offers (`nextStatuses` in
 * apps/admin), but that is a convenience, not a control: a hand-rolled request
 * could otherwise jump `pending → delivered` or reopen a cancelled order.
 * This map and the admin's `nextStatuses` are mirrors — change one, change the
 * other, exactly as the storefront/API validation rules are kept in sync.
 *
 * `cancelled` and `refunded` are terminal. A physical return is tracked in the
 * `Return` model, not as an order status; when its refund is issued the order
 * moves to `refunded`.
 */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_FLOW[from]?.includes(to) === true
}

/** Filters accepted by the admin order listing and CSV export. */
export interface OrderAdminFilters {
  status?: OrderStatus
  search?: string
  paymentStatus?: PaymentStatus
  paymentMethod?: Prisma.OrderWhereInput['paymentMethod']
  shippingMethod?: Prisma.OrderWhereInput['shippingMethod']
  dateFrom?: Date
  dateTo?: Date
  minTotal?: number
  maxTotal?: number
  city?: string
  province?: string
  sort?: string
  order?: 'asc' | 'desc'
}

const SORTABLE_ORDER_FIELDS = ['createdAt', 'total', 'number', 'status'] as const

/** A single CSV cell, quoted only when it contains a comma, quote or newline. */
function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}

/** Paisas → a plain rupee string for a spreadsheet cell (no symbol, 2 dp). */
function rupeeCell(paisas: number): string {
  return (paisas / 100).toFixed(2)
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async create(dto: CreateOrderDto, userId?: string) {
    // Feature flags are enforced here, not just in the checkout UI. Turning
    // guest checkout off in the admin panel has to actually stop guest orders,
    // otherwise the switch is decorative.
    if (!userId) {
      const guestCheckoutEnabled = await this.settings.getBoolean('guest_checkout_enabled', true)
      if (!guestCheckoutEnabled) {
        throw new BadRequestException('Please sign in or create an account to place an order.')
      }
    }

    if (dto.paymentMethod === 'cod') {
      const codEnabled = await this.settings.getBoolean('cod_enabled', true)
      if (!codEnabled) {
        throw new BadRequestException('Cash on delivery is not available at the moment.')
      }
    }

    // A guest has no account to be reached through, and `trackOrder` matches
    // on exactly these two fields — so an order placed without either is one
    // its own buyer can never look up and support cannot chase.
    if (!userId && !dto.guestPhone && !dto.guestEmail) {
      throw new BadRequestException(
        'A phone number or email is required so we can contact you about the order.',
      )
    }

    // Two lines for the same variant each pass the per-line stock check while
    // together exceeding stock, and would then be written as duplicate rows.
    const variantIds = dto.items.map((i) => i.variantId)
    if (new Set(variantIds).size !== variantIds.length) {
      throw new BadRequestException(
        'The same item appears more than once. Combine it into a single line.',
      )
    }

    const addressId = await this.resolveAddress(dto, userId)

    // Validate variants and compute totals
    let subtotal = 0
    const itemSnapshots: Array<{
      productId: string; variantId: string; name: string; image?: string
      tier: Tier; size?: string; color?: string; scent?: string
      price: number; quantity: number; hasGiftWrap: boolean; giftMessage?: string
    }> = []

    for (const item of dto.items) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
      })
      if (!variant) throw new BadRequestException(`Variant ${item.variantId} not found.`)
      if (variant.stock < item.quantity) throw new BadRequestException(`Insufficient stock for SKU ${variant.sku}.`)

      subtotal += variant.price * item.quantity
      itemSnapshots.push({
        productId: variant.productId,
        variantId: variant.id,
        name: variant.product.nameEn,
        image: variant.product.images[0]?.url,
        tier: variant.tier,
        size: variant.size ?? undefined,
        color: variant.color ?? undefined,
        scent: variant.scent ?? undefined,
        price: variant.price,
        quantity: item.quantity,
        hasGiftWrap: item.hasGiftWrap ?? false,
        giftMessage: item.giftMessage,
      })
    }

    // Coupon
    let discount = 0
    let couponId: string | undefined
    if (dto.couponCode) {
      const now = new Date()
      const coupon = await this.prisma.coupon.findFirst({
        where: {
          code: dto.couponCode.toUpperCase(),
          isActive: true,
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          ],
        },
      })
      if (coupon && (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)) {
        discount = coupon.type === 'percentage'
          ? Math.round(subtotal * coupon.value / 100)
          : coupon.value
        if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
        couponId = coupon.id
      }
    }

    // Shop configuration. Read through SettingsService so these values are
    // cached and come from the same source the storefront displays — the
    // previous local `getSettingInt` hit the table directly on every checkout
    // and duplicated the fallbacks.
    const [freeThreshold, stdShipping, expShipping, codFee, minOrder, taxPercent] =
      await Promise.all([
        this.settings.getNumber('free_shipping_threshold', 299900),
        this.settings.getNumber('standard_shipping_cost', 29900),
        this.settings.getNumber('express_shipping_cost', 49900),
        this.settings.getNumber('cod_fee', 0),
        this.settings.getNumber('min_order_amount', 0),
        this.settings.getNumber('tax_percentage', 0),
      ])

    const afterDiscount = subtotal - discount

    // Checked against the discounted subtotal, which is what the customer
    // actually pays for goods. Enforced here and not only in the UI, since
    // the minimum is a commercial rule rather than a form hint.
    if (minOrder > 0 && afterDiscount < minOrder) {
      throw new BadRequestException(
        `Orders must total at least ${this.formatPaisas(minOrder)}. Please add a little more to your basket.`,
      )
    }

    const shippingCost = afterDiscount >= freeThreshold ? 0
      : dto.shippingMethod === 'express' ? expShipping : stdShipping

    // Surcharge for handling cash. Zero by default, so this is inert until
    // someone sets `cod_fee`.
    const codSurcharge = dto.paymentMethod === 'cod' ? codFee : 0

    // Applied to goods only, not to shipping or the COD surcharge.
    const tax = taxPercent > 0 ? Math.round((afterDiscount * taxPercent) / 100) : 0

    const total = afterDiscount + shippingCost + codSurcharge + tax

    // Create order in transaction.
    //
    // The number is derived inside the retry loop, not once up front. The old
    // `count() + 1001` had two faults: it counted *all* orders ever rather
    // than the year's, so numbers drifted across a year boundary, and two
    // concurrent checkouts read the same count and produced the same number —
    // one of them then failing on the unique index at the worst moment.
    //
    // `number` is `@unique`, so the database is the arbiter: a loser of the
    // race gets P2002 and simply retries with the next value.
    const order = await this.createWithOrderNumber(async (tx, number) => {
      const o = await tx.order.create({
        data: {
          number,
          userId,
          guestEmail: dto.guestEmail,
          guestPhone: dto.guestPhone,
          addressId,
          paymentMethod: dto.paymentMethod,
          shippingMethod: dto.shippingMethod ?? 'standard',
          subtotal,
          // The COD surcharge rides on shippingCost: it is a delivery-related
          // charge and the column already exists, so no migration is needed to
          // make it visible on the order.
          shippingCost: shippingCost + codSurcharge,
          discount,
          tax,
          total,
          couponId,
          notes: dto.notes,
          items: { create: itemSnapshots as unknown as Prisma.OrderItemUncheckedCreateWithoutOrderInput[] },
          timeline: { create: { status: 'pending', note: 'Order placed' } },
        },
        include: ORDER_INCLUDE,
      })

      // Decrement stock
      for (const item of dto.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        })
        await tx.product.update({
          where: { id: itemSnapshots.find((i) => i.variantId === item.variantId)!.productId },
          data: { soldCount: { increment: item.quantity } },
        })
      }

      // Increment coupon usage
      if (couponId) {
        await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } })
      }

      return o
    })

    return order
  }

  /**
   * Compose the Prisma `where` for an admin (or customer) order query.
   *
   * Extracted so the listing and the CSV export apply *exactly* the same
   * filter — an export that quietly matched a different set than the screen it
   * was launched from would be worse than no export.
   */
  private buildOrderWhere(filters: OrderAdminFilters, userId?: string): Prisma.OrderWhereInput {
    return {
      ...(userId ? { userId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
      ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
      ...(filters.shippingMethod ? { shippingMethod: filters.shippingMethod } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
      ...(filters.minTotal != null || filters.maxTotal != null
        ? {
            total: {
              ...(filters.minTotal != null ? { gte: filters.minTotal } : {}),
              ...(filters.maxTotal != null ? { lte: filters.maxTotal } : {}),
            },
          }
        : {}),
      ...(filters.city || filters.province
        ? {
            address: {
              is: {
                ...(filters.city ? { city: { contains: filters.city } } : {}),
                ...(filters.province ? { province: { contains: filters.province } } : {}),
              },
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { number: { contains: filters.search } },
              { trackingNumber: { contains: filters.search } },
              { guestPhone: { contains: filters.search } },
              { guestEmail: { contains: filters.search } },
              { user: { name: { contains: filters.search } } },
              { user: { phone: { contains: filters.search } } },
              { user: { email: { contains: filters.search } } },
            ],
          }
        : {}),
    }
  }

  async findAll(
    userId?: string,
    page = 1,
    limit = 20,
    filters: OrderAdminFilters = {},
  ) {
    const where = this.buildOrderWhere(filters, userId)

    // Sort field is allowlisted so a query string cannot order by an arbitrary
    // (or non-indexed) column; direction defaults to newest-first.
    const sortField = (SORTABLE_ORDER_FIELDS as readonly string[]).includes(filters.sort ?? '')
      ? (filters.sort as (typeof SORTABLE_ORDER_FIELDS)[number])
      : 'createdAt'
    const sortOrder: 'asc' | 'desc' = filters.order === 'asc' ? 'asc' : 'desc'
    const orderBy = { [sortField]: sortOrder } as Prisma.OrderOrderByWithRelationInput

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where, include: ORDER_INCLUDE,
        orderBy,
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.order.count({ where }),
    ])
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  /**
   * CSV of the current filtered view. Bounded: an export is a snapshot of a
   * filtered screen, not a full-table dump, so a careless "export everything"
   * cannot stream the entire order history into a spreadsheet unnoticed.
   */
  async exportCsv(filters: OrderAdminFilters = {}): Promise<string> {
    const EXPORT_CAP = 5000
    const where = this.buildOrderWhere(filters)
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: { select: { id: true } },
        user: { select: { name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: EXPORT_CAP,
    })

    const header = [
      'Order Number', 'Placed', 'Customer', 'Phone', 'Email', 'Status',
      'Payment Status', 'Payment Method', 'Shipping Method', 'Items',
      'Subtotal', 'Shipping', 'Discount', 'Tax', 'Total', 'Tracking',
    ]
    const rows = orders.map((o) => [
      o.number,
      o.createdAt.toISOString(),
      o.user?.name ?? '',
      o.user?.phone ?? o.guestPhone ?? '',
      o.user?.email ?? o.guestEmail ?? '',
      o.status,
      o.paymentStatus,
      o.paymentMethod,
      o.shippingMethod,
      String(o.items.length),
      rupeeCell(o.subtotal),
      rupeeCell(o.shippingCost),
      rupeeCell(o.discount),
      rupeeCell(o.tax),
      rupeeCell(o.total),
      o.trackingNumber ?? '',
    ])
    return toCsv([header, ...rows])
  }

  /** Admin: fetch a single order by id, no ownership constraint. */
  async findByIdAdmin(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    })
    if (!order) throw new NotFoundException('Order not found.')
    return order
  }

  /** Dashboard KPIs: revenue, order counts, AOV, status breakdown. */
  async adminStats(days = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [all, recent, byStatus, todayOrders, refundedOrders] = await Promise.all([
      this.prisma.order.aggregate({ _count: { id: true }, _sum: { total: true } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: since }, status: { not: OrderStatus.cancelled } },
        _count: { id: true },
        _sum: { total: true },
      }),
      this.prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.order.count({ where: { status: OrderStatus.refunded } }),
    ])

    const recentCount = recent._count.id ?? 0
    const recentRevenue = recent._sum.total ?? 0
    const totalOrders = all._count.id ?? 0

    return {
      periodDays: days,
      totalOrders,
      totalRevenue: all._sum.total ?? 0,
      recentOrders: recentCount,
      recentRevenue,
      averageOrderValue: recentCount > 0 ? Math.round(recentRevenue / recentCount) : 0,
      todayOrders,
      refundedOrders,
      // Fraction (0–1); the dashboard formats it as a percentage.
      refundRate: totalOrders > 0 ? refundedOrders / totalOrders : 0,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    }
  }

  /**
   * Determine which address row the order ships to.
   *
   * A saved `addressId` is re-checked against the caller: without that, one
   * customer could pass another's address id and have goods delivered to it.
   * A guest instead supplies the address inline and we persist it, which is
   * what makes guest checkout possible at all.
   */
  private async resolveAddress(dto: CreateOrderDto, userId?: string): Promise<string> {
    if (dto.addressId) {
      const existing = await this.prisma.address.findFirst({
        where: { id: dto.addressId, ...(userId ? { userId } : {}) },
        select: { id: true },
      })
      if (!existing) throw new BadRequestException('Address not found.')
      return existing.id
    }

    if (!dto.address) {
      throw new BadRequestException('A delivery address is required.')
    }

    const created = await this.prisma.address.create({
      // A guest address has no owner; it exists only to be referenced by the
      // order it was created for.
      data: { ...dto.address, userId, isDefault: false },
      select: { id: true },
    })
    return created.id
  }

  /**
   * Run `work` inside a transaction with a freshly derived
   * `YH-<year>-<n>-<token>` order number, retrying on a unique-constraint
   * collision.
   *
   * Retries are bounded: a handful of attempts absorbs realistic checkout
   * concurrency, and anything beyond that is a genuine fault worth surfacing
   * rather than looping on.
   */
  private async createWithOrderNumber<T>(
    work: (tx: Prisma.TransactionClient, number: string) => Promise<T>,
  ): Promise<T> {
    const year = new Date().getFullYear()
    const prefix = `YH-${year}-`
    const MAX_ATTEMPTS = 5

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Highest number issued this year, so a new year restarts at 1001 and
      // deleted rows never cause a number to be reused.
      //
      // The sequence is still ordered and still 4-digit padded, so this
      // lexicographic `desc` continues to find the true maximum, and the
      // random token that follows it does not disturb that ordering.
      const latest = await this.prisma.order.findFirst({
        where: { number: { startsWith: prefix } },
        orderBy: { number: 'desc' },
        select: { number: true },
      })

      // `parseInt` stops at the first non-digit, so it reads the sequence out
      // of `1001-K7QX9M` without needing to know the token is there.
      const lastSeq = latest ? parseInt(latest.number.slice(prefix.length), 10) : 1000
      const next = (Number.isNaN(lastSeq) ? 1000 : lastSeq) + 1 + attempt
      const number = `${prefix}${String(next).padStart(4, '0')}-${randomOrderToken()}`

      try {
        return await this.prisma.$transaction((tx) => work(tx, number))
      } catch (e) {
        const isDuplicate =
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
        if (!isDuplicate || attempt === MAX_ATTEMPTS - 1) throw e
        // else: another checkout took this number — recompute and try again.
      }
    }

    throw new BadRequestException('Could not allocate an order number. Please retry.')
  }

  /**
   * Public order tracking, by order number alone.
   *
   * **The order number is the credential.** That is only safe because it now
   * carries a `crypto`-random Base32 token (`YH-2026-1001-K7QX9M`) — the
   * sequence on its own is walkable, and when the number alone was accepted
   * against a purely sequential scheme, `YH-2026-1001`, `1002`, … dumped the
   * order table.
   *
   * Two properties therefore have to hold together, and neither survives
   * without the other:
   *
   * 1. Every order number contains the random token. The migration that
   *    introduced it backfilled historical rows for exactly this reason —
   *    a single un-tokenised row is a publicly readable order.
   * 2. The response stays limited to fulfilment-relevant fields: no address,
   *    no name, no email or phone, no coupon or payment data. Someone who
   *    finds a number on a shared screenshot learns the delivery status, not
   *    where the customer lives.
   *
   * A miss is a plain 404, identical for a malformed number and a well-formed
   * one that does not exist, so this cannot be used as an existence oracle.
   */
  async trackByNumber(number: string) {
    const order = await this.prisma.order.findFirst({
      where: { number: number.trim().toUpperCase() },
      include: {
        items: { select: { name: true, image: true, quantity: true, tier: true, size: true, color: true } },
        timeline: { orderBy: { createdAt: 'desc' as const }, select: { status: true, note: true, createdAt: true } },
      },
    })

    if (!order) throw new NotFoundException(`Order ${number} not found.`)

    return {
      number: order.number,
      status: order.status,
      shippingMethod: order.shippingMethod,
      trackingNumber: order.trackingNumber,
      total: order.total,
      createdAt: order.createdAt,
      items: order.items,
      timeline: order.timeline,
    }
  }

  async findByNumber(number: string, userId?: string) {
    const order = await this.prisma.order.findFirst({
      where: { number, ...(userId ? { userId } : {}) },
      include: ORDER_INCLUDE,
    })
    if (!order) throw new NotFoundException(`Order ${number} not found.`)
    return order
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } })
    if (!order) throw new NotFoundException('Order not found.')

    // Enforced here, not only in the admin dropdown. The flow is the same shape
    // the UI offers; the server is what makes it a rule rather than a hint.
    if (!canTransitionOrder(order.status, dto.status)) {
      throw new BadRequestException(
        `An order that is ${order.status} cannot move to ${dto.status}.`,
      )
    }

    return this.prisma.$transaction([
      this.prisma.order.update({ where: { id }, data: { status: dto.status } }),
      this.prisma.orderTimeline.create({ data: { orderId: id, status: dto.status, note: dto.note } }),
    ])
  }

  /**
   * Assign or clear the courier tracking number. Separate from status so a
   * parcel can be marked shipped and its tracking added in either order.
   */
  async setTracking(id: string, trackingNumber: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, select: { id: true } })
    if (!order) throw new NotFoundException('Order not found.')
    return this.prisma.order.update({
      where: { id },
      data: { trackingNumber: trackingNumber.trim() || null },
      include: ORDER_INCLUDE,
    })
  }

  /**
   * Move payment status by hand — for COD this is how an order becomes `paid`
   * on collection, since no gateway callback exists to do it.
   *
   * There is no audit-log table yet (a later phase), so the change is recorded
   * on the timeline against the order's current status. That is a trace, not a
   * full audit entry, and is called out as such in the migration plan.
   */
  async setPaymentStatus(id: string, paymentStatus: PaymentStatus, note?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } })
    if (!order) throw new NotFoundException('Order not found.')
    const label = paymentStatus.replace(/_/g, ' ')
    return this.prisma.$transaction([
      this.prisma.order.update({ where: { id }, data: { paymentStatus } }),
      this.prisma.orderTimeline.create({
        data: { orderId: id, status: order.status, note: note?.trim() || `Payment marked ${label}` },
      }),
    ])
  }

  /**
   * Apply one status to many orders. Each is checked against the same
   * transition rule as a single update; orders that cannot legally move are
   * skipped and counted rather than failing the whole batch.
   */
  async bulkUpdateStatus(ids: string[], status: OrderStatus, note?: string) {
    const orders = await this.prisma.order.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    })
    const eligible = orders.filter((o) => canTransitionOrder(o.status, status))

    if (eligible.length > 0) {
      await this.prisma.$transaction(
        eligible.flatMap((o) => [
          this.prisma.order.update({ where: { id: o.id }, data: { status } }),
          this.prisma.orderTimeline.create({ data: { orderId: o.id, status, note } }),
        ]),
      )
    }

    return {
      requested: ids.length,
      updated: eligible.length,
      skipped: orders.length - eligible.length,
      notFound: ids.length - orders.length,
    }
  }

  async cancel(id: string, userId?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, ...(userId ? { userId } : {}) },
    })
    if (!order) throw new NotFoundException('Order not found.')
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage.')
    }
    return this.updateStatus(id, { status: OrderStatus.cancelled, note: 'Cancelled by customer' })
  }

  /** Paisas → a readable rupee amount for customer-facing messages. */
  private formatPaisas(paisas: number): string {
    return `₨${Math.round(paisas / 100).toLocaleString('en-PK')}`
  }
}
