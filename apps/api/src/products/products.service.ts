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
  // Ordered cheapest-first. Without an `orderBy` the database returns these in
  // whatever order it likes, and anything downstream that reached for
  // `variants[0]` got an arbitrary variant — which is how a product card and
  // its own product page came to advertise two different prices.
  variants: { orderBy: { price: 'asc' as const } },
  images: { orderBy: { order: 'asc' as const } },
  badges: true,
  tags: true,
  sizeGuide: { orderBy: { order: 'asc' as const } },
  kitContents: {
    include: { member: { select: { id: true, slug: true, nameEn: true, nameUr: true, nameAr: true, images: { where: { isPrimary: true }, take: 1 } } } },
  },
}

interface IncomingMedia {
  url: string
  alt?: string
  isPrimary?: boolean
  order?: number
}

/**
 * Force the media list into a shape the rest of the system can rely on:
 * exactly one primary, and `order` matching the position staff arranged.
 *
 * Two callers already assume this and break quietly without it. The kit
 * contents select above filters on `isPrimary: true` and takes one, so a
 * product where nobody ticked the box contributes no image to a kit at all;
 * and the storefront sorts primary-first, which is meaningless if two rows
 * claim it. Normalising here means it holds no matter which client wrote it.
 */
export function normaliseMedia(images: IncomingMedia[]) {
  const primaryIndex = images.findIndex((img) => img.isPrimary)
  const chosen = primaryIndex === -1 ? 0 : primaryIndex

  return images.map((img, i) => ({
    url: img.url,
    alt: img.alt,
    isPrimary: i === chosen,
    order: i,
  }))
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const {
      category, tier, minPrice, maxPrice, size, color, scent,
      rating, inStock, badges, search, sort, featured, page = 1, limit = 24,
    } = query

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(featured && { isFeatured: true }),
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

    const skip = (page - 1) * limit

    // Price sorting cannot be expressed as a Prisma `orderBy` — a product's
    // price lives on its cheapest variant, and relation aggregates aren't
    // orderable. The previous `variants: { _count: 'asc' }` silently sorted by
    // the *number of variants* instead, so "price: low to high" on the shop
    // page returned an order unrelated to price.
    if (sort === 'price_asc' || sort === 'price_desc') {
      return this.findAllSortedByPrice(where, sort, page, limit)
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where, select: PRODUCT_SELECT, orderBy: this.buildOrderBy(sort), skip, take: limit,
      }),
      this.prisma.product.count({ where }),
    ])

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  /**
   * Order by each product's cheapest active variant.
   *
   * Resolves ids first, then sorts on a variant aggregate, then fetches only
   * the page's rows. Three cheap queries instead of one, which is the price of
   * getting the order right; the id and aggregate passes both hit indexes and
   * return narrow rows.
   */
  private async findAllSortedByPrice(
    where: Prisma.ProductWhereInput,
    sort: 'price_asc' | 'price_desc',
    page: number,
    limit: number,
  ) {
    const matching = await this.prisma.product.findMany({ where, select: { id: true } })
    const ids = matching.map((p) => p.id)
    if (ids.length === 0) {
      return { items: [], meta: { total: 0, page, limit, totalPages: 0 } }
    }

    const grouped = await this.prisma.productVariant.groupBy({
      by: ['productId'],
      where: { productId: { in: ids }, isActive: true },
      _min: { price: true },
    })

    const priceOf = new Map(grouped.map((g) => [g.productId, g._min.price ?? Number.MAX_SAFE_INTEGER]))
    const direction = sort === 'price_asc' ? 1 : -1

    const ordered = [...ids].sort((a, b) => {
      const pa = priceOf.get(a) ?? Number.MAX_SAFE_INTEGER
      const pb = priceOf.get(b) ?? Number.MAX_SAFE_INTEGER
      // Products with no active variant have no price; keep them last in both
      // directions rather than letting them head the "most expensive" page.
      if (pa === pb) return a < b ? -1 : 1
      return (pa - pb) * direction
    })

    const pageIds = ordered.slice((page - 1) * limit, page * limit)
    const rows = await this.prisma.product.findMany({
      where: { id: { in: pageIds } },
      select: PRODUCT_SELECT,
    })

    // `findMany` ignores the order of an `in` clause, so restore it.
    const byId = new Map(rows.map((r) => [r.id, r]))
    const items = pageIds.map((id) => byId.get(id)).filter(Boolean)

    return {
      items,
      meta: { total: ids.length, page, limit, totalPages: Math.ceil(ids.length / limit) },
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
        images: images ? { create: normaliseMedia(images) } : undefined,
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
            data: normaliseMedia(images).map((img) => ({ ...img, productId: id })),
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
      // price_asc / price_desc are handled by findAllSortedByPrice — they
      // cannot be expressed here and must never fall through to a default.
      case 'newest': return { createdAt: 'desc' }
      case 'rating': return { avgRating: 'desc' }
      case 'popularity': default: return { soldCount: 'desc' }
    }
  }
}
