import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(productId: string) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: [{ tier: 'asc' }, { price: 'asc' }],
    })
  }

  async updateStock(id: string, stock: number) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id } })
    if (!variant) throw new NotFoundException('Variant not found.')
    return this.prisma.productVariant.update({ where: { id }, data: { stock } })
  }

  async updatePrice(id: string, price: number, compareAtPrice?: number) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id } })
    if (!variant) throw new NotFoundException('Variant not found.')
    return this.prisma.productVariant.update({ where: { id }, data: { price, compareAtPrice } })
  }

  async remove(id: string) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id } })
    if (!variant) throw new NotFoundException('Variant not found.')
    return this.prisma.productVariant.delete({ where: { id } })
  }
}
