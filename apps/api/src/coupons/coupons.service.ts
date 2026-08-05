import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCouponDto } from './dto/create-coupon.dto'
import { UpdateCouponDto } from './dto/update-coupon.dto'

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(code: string, subtotal: number, userId?: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
      },
    })
    if (!coupon) throw new NotFoundException('Coupon not found or inactive.')

    const now = new Date()
    if (coupon.startsAt && coupon.startsAt > now) throw new BadRequestException('Coupon not yet active.')
    if (coupon.expiresAt && coupon.expiresAt < now) throw new BadRequestException('Coupon has expired.')
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached.')
    if (coupon.minOrderAmt && subtotal < coupon.minOrderAmt) {
      throw new BadRequestException(`Minimum order of Rs ${(coupon.minOrderAmt / 100).toFixed(0)} required.`)
    }

    let discount = coupon.type === 'percentage'
      ? Math.round(subtotal * coupon.value / 100)
      : coupon.value
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)

    return { valid: true, code: coupon.code, discount, couponId: coupon.id }
  }

  async findAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  }

  async create(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findFirst({ where: { code: dto.code.toUpperCase() } })
    if (existing) throw new BadRequestException('Coupon code already exists.')
    return this.prisma.coupon.create({ data: { ...dto, code: dto.code.toUpperCase() } })
  }

  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } })
    if (!coupon) throw new NotFoundException('Coupon not found.')
    return this.prisma.coupon.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } })
    if (!coupon) throw new NotFoundException('Coupon not found.')
    return this.prisma.coupon.delete({ where: { id } })
  }
}
