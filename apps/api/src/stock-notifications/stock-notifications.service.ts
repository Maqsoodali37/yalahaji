import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateStockNotificationDto } from './dto/create-stock-notification.dto'

@Injectable()
export class StockNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register interest in an out-of-stock product.
   *
   * Always reports success once the product exists. Signing up twice is a
   * no-op rather than an error: the customer's intent is unchanged, and
   * telling them "you already asked" leaks nothing useful and reads as a
   * failure.
   */
  async create(dto: CreateStockNotificationDto, userId?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, isActive: true },
      select: { id: true },
    })
    if (!product) throw new NotFoundException('Product not found.')

    const email = dto.email.trim().toLowerCase()

    const existing = await this.prisma.stockNotification.findFirst({
      where: { productId: product.id, email, notified: false },
      select: { id: true },
    })
    if (existing) return { ok: true }

    await this.prisma.stockNotification.create({
      data: { productId: product.id, email, userId },
    })
    return { ok: true }
  }
}
