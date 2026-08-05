import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateKitCategoryDto } from './dto/create-kit-category.dto'
import { UpdateKitCategoryDto } from './dto/update-kit-category.dto'
import { Prisma } from '@prisma/client'

/**
 * Product shape returned for each kit step.
 *
 * Matches what the storefront's `adaptProduct` reads, so the builder can use
 * the same adapter as every other product surface rather than a parallel one
 * that would drift. The two genuinely heavy relations are left out:
 * `sizeGuide` and `kitContents` are never rendered in the builder, and
 * `kitContents` in particular fans out into another product per row.
 */
const KIT_PRODUCT_SELECT = {
  id: true,
  slug: true,
  sku: true,
  nameEn: true,
  nameUr: true,
  nameAr: true,
  descEn: true,
  descUr: true,
  descAr: true,
  shortDescEn: true,
  shortDescUr: true,
  shortDescAr: true,
  isKit: true,
  hasGiftWrap: true,
  hasPreOrder: true,
  avgRating: true,
  reviewCount: true,
  soldCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, slug: true, nameEn: true } },
  // Cheapest-first, matching `PRODUCT_SELECT` in products.service.ts.
  variants: { orderBy: { price: 'asc' as const } },
  images: { orderBy: { order: 'asc' as const } },
  badges: true,
  tags: true,
}

@Injectable()
export class KitCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kit steps with the products a customer can choose in each.
   *
   * Products are resolved through the step's linked catalogue categories, so
   * adding a product to `ihram` automatically offers it in the Ihram step —
   * the storefront's old hardcoded version had to be redeployed for that.
   *
   * Steps with no purchasable products are dropped: a step a customer cannot
   * complete blocks the whole flow when it is marked required.
   */
  async findAll(includeInactive = false) {
    const steps = await this.prisma.kitCategory.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        sources: {
          orderBy: { order: 'asc' },
          include: { category: { select: { id: true, slug: true, nameEn: true } } },
        },
      },
      orderBy: { order: 'asc' },
    })

    if (steps.length === 0) return []

    // One query for every step's products rather than one per step. The N+1
    // version was fine with five steps and would not stay fine.
    const categoryIds = [...new Set(steps.flatMap((s) => s.sources.map((x) => x.categoryId)))]

    const products = categoryIds.length
      ? await this.prisma.product.findMany({
          where: {
            categoryId: { in: categoryIds },
            isActive: true,
            // A kit is itself a product; offering kits as components of a kit
            // would let a customer nest one inside another.
            isKit: false,
          },
          select: KIT_PRODUCT_SELECT,
          orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }],
        })
      : []

    const byCategory = new Map<string, typeof products>()
    for (const p of products) {
      const list = byCategory.get(p.category.id) ?? []
      list.push(p)
      byCategory.set(p.category.id, list)
    }

    return steps
      .map((step) => ({
        id: step.id,
        slug: step.slug,
        nameEn: step.nameEn,
        nameUr: step.nameUr,
        nameAr: step.nameAr,
        icon: step.icon,
        required: step.required,
        order: step.order,
        isActive: step.isActive,
        categorySlugs: step.sources.map((s) => s.category.slug),
        products: step.sources.flatMap((s) => byCategory.get(s.categoryId) ?? []),
      }))
      .filter((step) => includeInactive || step.products.length > 0)
  }

  async findOne(id: string) {
    const step = await this.prisma.kitCategory.findUnique({
      where: { id },
      include: { sources: { include: { category: true }, orderBy: { order: 'asc' } } },
    })
    if (!step) throw new NotFoundException('Kit category not found.')
    return step
  }

  async create(dto: CreateKitCategoryDto) {
    const existing = await this.prisma.kitCategory.findUnique({ where: { slug: dto.slug } })
    if (existing) throw new ConflictException('Slug already in use.')

    const { categoryIds, ...rest } = dto
    await this.assertCategoriesExist(categoryIds)

    return this.prisma.kitCategory.create({
      data: {
        ...rest,
        sources: {
          create: categoryIds.map((categoryId, index) => ({ categoryId, order: index })),
        },
      },
      include: { sources: { include: { category: true } } },
    })
  }

  async update(id: string, dto: UpdateKitCategoryDto) {
    const step = await this.prisma.kitCategory.findUnique({ where: { id } })
    if (!step) throw new NotFoundException('Kit category not found.')

    const { categoryIds, ...rest } = dto

    if (rest.slug && rest.slug !== step.slug) {
      const clash = await this.prisma.kitCategory.findUnique({ where: { slug: rest.slug } })
      if (clash) throw new ConflictException('Slug already in use.')
    }

    if (categoryIds) await this.assertCategoriesExist(categoryIds)

    // Replacing the links wholesale inside a transaction: a partial rewrite
    // would leave a step pointing at some old categories and some new ones.
    return this.prisma.$transaction(async (tx) => {
      if (categoryIds) {
        await tx.kitCategorySource.deleteMany({ where: { kitCategoryId: id } })
        await tx.kitCategorySource.createMany({
          data: categoryIds.map((categoryId, index) => ({
            kitCategoryId: id,
            categoryId,
            order: index,
          })),
        })
      }

      return tx.kitCategory.update({
        where: { id },
        data: rest as Prisma.KitCategoryUncheckedUpdateInput,
        include: { sources: { include: { category: true } } },
      })
    })
  }

  async remove(id: string) {
    const step = await this.prisma.kitCategory.findUnique({ where: { id } })
    if (!step) throw new NotFoundException('Kit category not found.')
    // `sources` cascade from the FK, so the links go with it.
    return this.prisma.kitCategory.delete({ where: { id } })
  }

  /**
   * Rejects unknown ids up front. Without this the FK would fail mid-insert
   * with a driver-level message that names a constraint rather than telling
   * the caller which category id was wrong.
   */
  private async assertCategoriesExist(categoryIds: string[]) {
    const found = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    })
    const known = new Set(found.map((c) => c.id))
    const missing = categoryIds.filter((id) => !known.has(id))
    if (missing.length) {
      throw new BadRequestException(`Unknown category id(s): ${missing.join(', ')}`)
    }
  }
}
