import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateReviewDto } from './dto/create-review.dto'

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReviewDto, userId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } })
    if (!product) throw new NotFoundException('Product not found.')

    // One review per user per product
    const existing = await this.prisma.review.findFirst({ where: { userId, productId: dto.productId } })
    if (existing) throw new BadRequestException('You have already reviewed this product.')

    const user = await this.prisma.user.findUnique({ where: { id: userId } })

    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        author: user?.name ?? 'Anonymous',
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        videoUrl: dto.videoUrl,
        images: dto.images ? JSON.stringify(dto.images) : undefined,
        verified: true,
      },
    })
    await this.recomputeRating(dto.productId)
    return review
  }

  async findByProduct(productId: string, page = 1, limit = 10) {
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId, approved: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.review.count({ where: { productId, approved: true } }),
    ])
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async approve(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } })
    if (!review) throw new NotFoundException('Review not found.')
    const updated = await this.prisma.review.update({ where: { id }, data: { approved: true } })
    await this.recomputeRating(review.productId)
    return updated
  }

  async remove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } })
    if (!review) throw new NotFoundException('Review not found.')
    await this.prisma.review.delete({ where: { id } })
    await this.recomputeRating(review.productId)
    return { deleted: true }
  }

  private async recomputeRating(productId: string) {
    const { _avg, _count } = await this.prisma.review.aggregate({
      where: { productId, approved: true },
      _avg: { rating: true },
      _count: { id: true },
    })
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: _avg.rating ?? 0,
        reviewCount: _count.id,
      },
    })
  }
}
