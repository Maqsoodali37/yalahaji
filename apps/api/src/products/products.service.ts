import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductQueryDto } from './dto/product-query.dto'
import { Prisma, Tier } from '@prisma/client'

// Standard product select — includes all relations needed by storefront
const PRODUCT_SELECT = {
  id: true, slug: true, sku: true,
  nameEn: true, nameUr: true, nameAr: true,
  descEn: true, descUr: true, descAr: true,
  shortDescEn: true, shortDescUr: true, shortDescAr: true,
  isKit: true, hasGiftWrap: true, hasPreOrder: true,
  avgRating: true, reviewCount: true, soldCount: true,
  isActive: true, isFeatured: true,
  metaTitle: true, metaDesc: true,
  createdAt: true, updatedAt: true,
  category: { select: { id: true, slug: true, nameEn: true } },
  variants: true,
  images: { orderBy: { order: 'asc' as const } },
  badges: true,
  tags: true,
  sizeGuide: { orderBy: { order: 'asc' as const } },
  kitContents: {
    include: { member: { select: { id: true, slug: true, nameEn: true, nameUr: true, nameAr: true, images: { where: { isPrimary: true }, take: 1 } } } },
  },
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const {
      category, tier, minPrice, maxPrice, size, color, scent,
      rating, inStock, badges, search, sort, page = 1, limit = 24,
    } = query

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(category && { category: { slug: category } }),
      ...(badges && { badges: { some: { badge: { in: badges } } } }),
      ...(search && {
        OR: [
          { nameEn: { contains: search } },
          { nameUr: { contains: search } },
          { tags: { some: { tag: { contains: search } } } },
        ],
      }),
      variants: {
        some: {
          isActive: true,
          ...(tier && { tier: { in: tier as Tier[] } }),
          ...(size && { size: { in: size } }),
          ...(color && { color: { in: color } }),
          ...(scent && { scent: { in: scent } }),
          ...(minPrice !== undefined && { price: { gte: minPrice * 100 } }),
          ...(maxPrice !== undefined && { price: { lte: maxPrice * 100 } }),
          ...(inStock && { stock: { gt: 0 } }),
        },
      },
      ...(rating && { avgRating: { gte: rating } }),
    }

    const orderBy = this.buildOrderBy(sort)
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({ where, select: PRODUCT_SELECT, orderBy, skip, take: limit }),
      this.prisma.product.count({ where }),
    ])

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  /** Admin listing — includes inactive products, supports status filter. */
  async findAllAdmin(opts: {
    search?: string
    category?: string
    status?: 'active' | 'inactive' | 'all'
    page?: number
    limit?: number
  }) {
    const { search, category, status = 'all', page = 1, limit = 20 } = opts

    const where: Prisma.ProductWhereInput = {
      ...(status === 'active' && { isActive: true }),
      ...(status === 'inactive' && { isActive: false }),
      ...(category && { categoryId: category }),
      ...(search && {
        OR: [
          { nameEn: { contains: search } },
          { sku: { contains: search } },
          { slug: { contains: search } },
        ],
      }),
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: PRODUCT_SELECT,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ])

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  /** Variants below their low-stock threshold, for the inventory dashboard. */
  async findLowStock(limit = 20) {
    const variants = await this.prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: { select: { id: true, slug: true, nameEn: true } } },
      orderBy: { stock: 'asc' },
      take: 200,
    })
    return variants
      .filter((v) => v.stock <= v.lowStockThreshold)
      .slice(0, limit)
  }

  /** Aggregate counts for the dashboard overview. */
  async adminStats() {
    const [productCount, activeCount, variants] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.productVariant.findMany({
        where: { isActive: true },
        select: { stock: true, lowStockThreshold: true },
      }),
    ])
    return {
      productCount,
      activeCount,
      inactiveCount: productCount - activeCount,
      lowStockCount: variants.filter((v) => v.stock <= v.lowStockThreshold).length,
      outOfStockCount: variants.filter((v) => v.stock === 0).length,
    }
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug, isActive: true },
      select: PRODUCT_SELECT,
    })
    if (!product) throw new NotFoundException(`Product "${slug}" not found.`)
    return product
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: PRODUCT_SELECT,
    })
    if (!product) throw new NotFoundException('Product not found.')
    return product
  }

  async findRelated(productId: string, limit = 4) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    })
    if (!product) return []
    return this.prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: productId }, isActive: true },
      select: PRODUCT_SELECT,
      take: limit,
      orderBy: { soldCount: 'desc' },
    })
  }

  async create(dto: CreateProductDto) {
    const { badges, tags, variants, images, sizeGuide, ...data } = dto
    return this.prisma.product.create({
      data: {
        ...data,
        badges: badges ? { create: badges.map((b) => ({ badge: b })) } : undefined,
        tags: tags ? { create: tags.map((t) => ({ tag: t })) } : undefined,
        variants: variants ? { create: variants } : undefined,
        images: images ? { create: images } : undefined,
        sizeGuide: sizeGuide ? { create: sizeGuide } : undefined,
      },
      select: PRODUCT_SELECT,
    })
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id)
    const { badges, tags, variants, images, sizeGuide, ...data } = dto

    return this.prisma.$transaction(async (tx) => {
      // Scalar fields first.
      await tx.product.update({ where: { id }, data })

      // Badges and tags are replace-all collections.
      if (badges) {
        await tx.productBadge.deleteMany({ where: { productId: id } })
        if (badges.length > 0) {
          await tx.productBadge.createMany({
            data: badges.map((badge) => ({ productId: id, badge })),
          })
        }
      }

      if (tags) {
        await tx.productTag.deleteMany({ where: { productId: id } })
        if (tags.length > 0) {
          await tx.productTag.createMany({
            data: tags.map((tag) => ({ productId: id, tag })),
          })
        }
      }

      // Variants are matched on SKU: update existing, create new, prune removed.
      if (variants) {
        const existing = await tx.productVariant.findMany({ where: { productId: id } })
        const incomingSkus = new Set(variants.map((v) => v.sku))

        const removed = existing.filter((v) => !incomingSkus.has(v.sku))
        if (removed.length > 0) {
          // Deactivate rather than delete — order history references these rows.
          await tx.productVariant.updateMany({
            where: { id: { in: removed.map((v) => v.id) } },
            data: { isActive: false },
          })
        }

        for (const variant of variants) {
          const match = existing.find((v) => v.sku === variant.sku)
          if (match) {
            await tx.productVariant.update({
              where: { id: match.id },
              data: { ...variant, isActive: true },
            })
          } else {
            await tx.productVariant.create({ data: { ...variant, productId: id } })
          }
        }
      }

      if (images) {
        await tx.productMedia.deleteMany({ where: { productId: id } })
        if (images.length > 0) {
          await tx.productMedia.createMany({
            data: images.map((img) => ({ ...img, productId: id })),
          })
        }
      }

      if (sizeGuide) {
        await tx.sizeGuideEntry.deleteMany({ where: { productId: id } })
        if (sizeGuide.length > 0) {
          await tx.sizeGuideEntry.createMany({
            data: sizeGuide.map((entry) => ({ ...entry, productId: id })),
          })
        }
      }

      return tx.product.findUnique({ where: { id }, select: PRODUCT_SELECT })
    })
  }

  async remove(id: string) {
    await this.findById(id)
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    })
  }

  async updateRating(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId, approved: true },
      _avg: { rating: true },
      _count: { rating: true },
    })
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: agg._avg.rating ?? 0,
        reviewCount: agg._count.rating,
      },
    })
  }

  private buildOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc': return { variants: { _count: 'asc' } }
      case 'price_desc': return { variants: { _count: 'desc' } }
      case 'newest': return { createdAt: 'desc' }
      case 'rating': return { avgRating: 'desc' }
      case 'popularity': default: return { soldCount: 'desc' }
    }
  }
}
