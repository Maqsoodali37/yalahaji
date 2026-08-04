import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
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
  coupon: { select: { code: true, type: true, value: true } },
  timeline: { orderBy: { createdAt: 'desc' as const } },
  returns: true,
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto, userId?: string) {
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

    // Shipping
    const freeThreshold = await this.getSettingInt('free_shipping_threshold', 299900)
    const stdShipping = await this.getSettingInt('standard_shipping_cost', 29900)
    const expShipping = await this.getSettingInt('express_shipping_cost', 49900)
    const afterDiscount = subtotal - discount
    const shippingCost = afterDiscount >= freeThreshold ? 0
      : dto.shippingMethod === 'express' ? expShipping : stdShipping

    const total = afterDiscount + shippingCost

    // Generate order number
    const year = new Date().getFullYear()
    const count = await this.prisma.order.count()
    const number = `YH-${year}-${String(count + 1001).padStart(4, '0')}`

    // Create order in transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          number,
          userId,
          guestEmail: dto.guestEmail,
          guestPhone: dto.guestPhone,
          addressId: dto.addressId,
          paymentMethod: dto.paymentMethod,
          shippingMethod: dto.shippingMethod ?? 'standard',
          subtotal,
          shippingCost,
          discount,
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

  async findAll(userId?: string, page = 1, limit = 20) {
    const where = userId ? { userId } : {}
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

  private async getSettingInt(key: string, fallback: number) {
    const s = await this.prisma.setting.findUnique({ where: { key } })
    return s ? parseInt(s.value, 10) : fallback
  }
}
