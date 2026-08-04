import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '@prisma/client'

const CART_INCLUDE = {
  variant: true,
  product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) return []
    const where: Prisma.CartItemWhereInput = userId ? { userId } : { sessionId }
    return this.prisma.cartItem.findMany({ where, include: CART_INCLUDE, orderBy: { createdAt: 'asc' } })
  }

  async upsert(
    variantId: string,
    quantity: number,
    hasGiftWrap = false,
    giftMessage?: string,
    userId?: string,
    sessionId?: string,
  ) {
    if (!userId && !sessionId) throw new BadRequestException('No user or session identifier provided.')

    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } })
    if (!variant) throw new NotFoundException('Variant not found.')
    if (variant.stock < quantity) throw new BadRequestException('Insufficient stock.')

    // No compound unique on cart_items — find then create/update
    const existing = await this.prisma.cartItem.findFirst({
      where: userId ? { userId, variantId } : { sessionId, variantId },
    })

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity, hasGiftWrap, giftMessage },
        include: CART_INCLUDE,
      })
    }

    return this.prisma.cartItem.create({
      data: {
        productId: variant.productId,
        variantId,
        quantity,
        hasGiftWrap,
        giftMessage,
        userId,
        sessionId,
      },
      include: CART_INCLUDE,
    })
  }

  async remove(id: string, userId?: string, sessionId?: string) {
    const where: Prisma.CartItemWhereInput = { id }
    if (userId) where.userId = userId
    else if (sessionId) where.sessionId = sessionId

    const item = await this.prisma.cartItem.findFirst({ where })
    if (!item) throw new NotFoundException('Cart item not found.')
    return this.prisma.cartItem.delete({ where: { id } })
  }

  async clear(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) return { count: 0 }
    const where: Prisma.CartItemWhereInput = userId ? { userId } : { sessionId }
    return this.prisma.cartItem.deleteMany({ where })
  }

  async merge(sessionId: string, userId: string) {
    const guestItems = await this.prisma.cartItem.findMany({ where: { sessionId } })
    for (const item of guestItems) {
      await this.upsert(item.variantId, item.quantity, item.hasGiftWrap, item.giftMessage ?? undefined, userId)
    }
    await this.clear(undefined, sessionId)
    return { merged: guestItems.length }
  }
}
