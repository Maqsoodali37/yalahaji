import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { OrderStatus, Prisma, Tier } from '@prisma/client'

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

  async findAll(
    userId?: string,
    page = 1,
    limit = 20,
    filters: { status?: OrderStatus; search?: string } = {},
  ) {
    const where: Prisma.OrderWhereInput = {
      ...(userId ? { userId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { number: { contains: filters.search } },
              { guestPhone: { contains: filters.search } },
              { guestEmail: { contains: filters.search } },
              { user: { name: { contains: filters.search } } },
              { user: { phone: { contains: filters.search } } },
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where, include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.order.count({ where }),
    ])
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
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

    const [all, recent, byStatus] = await Promise.all([
      this.prisma.order.aggregate({ _count: { id: true }, _sum: { total: true } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: since }, status: { not: OrderStatus.cancelled } },
        _count: { id: true },
        _sum: { total: true },
      }),
      this.prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
    ])

    const recentCount = recent._count.id ?? 0
    const recentRevenue = recent._sum.total ?? 0

    return {
      periodDays: days,
      totalOrders: all._count.id ?? 0,
      totalRevenue: all._sum.total ?? 0,
      recentOrders: recentCount,
      recentRevenue,
      averageOrderValue: recentCount > 0 ? Math.round(recentRevenue / recentCount) : 0,
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
   * Run `work` inside a transaction with a freshly derived `YH-<year>-<n>`
   * order number, retrying on a unique-constraint collision.
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
      const latest = await this.prisma.order.findFirst({
        where: { number: { startsWith: prefix } },
        orderBy: { number: 'desc' },
        select: { number: true },
      })

      const lastSeq = latest ? parseInt(latest.number.slice(prefix.length), 10) : 1000
      const next = (Number.isNaN(lastSeq) ? 1000 : lastSeq) + 1 + attempt
      const number = `${prefix}${String(next).padStart(4, '0')}`

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
   * Public order tracking.
   *
   * Order numbers are sequential and therefore guessable, so the number alone
   * cannot be the credential — previously it was, and it returned the full
   * order including the delivery address and the customer's name, email and
   * phone. Walking `YH-2026-1001`, `1002`, … dumped the order table.
   *
   * The caller must now also present the email or phone the order was placed
   * with, and even then only gets fulfilment-relevant fields: no address, no
   * contact details, no coupon or payment data. A mismatch is reported as a
   * plain 404 so this cannot be used to test whether a number exists.
   */
  async trackByNumber(number: string, contact: string) {
    const order = await this.prisma.order.findFirst({
      where: { number },
      include: {
        items: { select: { name: true, image: true, quantity: true, tier: true, size: true, color: true } },
        timeline: { orderBy: { createdAt: 'desc' as const }, select: { status: true, note: true, createdAt: true } },
        user: { select: { email: true, phone: true } },
      },
    })

    const notFound = new NotFoundException(`Order ${number} not found.`)
    if (!order) throw notFound
    if (!this.contactMatches(order, contact)) throw notFound

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

  /**
   * Emails compare case-insensitively; phones compare on their last 10 digits
   * so `+92 300 1234567`, `0300-1234567` and `03001234567` all match.
   */
  private contactMatches(
    order: { guestEmail: string | null; guestPhone: string | null; user: { email: string | null; phone: string | null } | null },
    contact: string,
  ) {
    const input = contact.trim()
    if (!input) return false

    const emails = [order.guestEmail, order.user?.email]
    if (emails.some((e) => e && e.toLowerCase() === input.toLowerCase())) return true

    const digits = (v: string) => v.replace(/\D/g, '').slice(-10)
    const inputDigits = digits(input)
    if (inputDigits.length < 10) return false

    return [order.guestPhone, order.user?.phone].some((p) => p && digits(p) === inputDigits)
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

    return this.prisma.$transaction([
      this.prisma.order.update({ where: { id }, data: { status: dto.status } }),
      this.prisma.orderTimeline.create({ data: { orderId: id, status: dto.status, note: dto.note } }),
    ])
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
