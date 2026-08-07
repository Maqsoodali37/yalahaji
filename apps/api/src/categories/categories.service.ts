import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import type { CategoryBulkAction } from './dto/bulk-category-action.dto'
import { Prisma } from '@prisma/client'

interface TreeRow {
  id: string
  parentId: string | null
  [key: string]: unknown
}

export interface ReorderItem {
  id: string
  parentId?: string | null
  order: number
}

interface BulkSkip {
  id: string
  name: string
  reason: string
}

/**
 * Nests a flat row list into a tree, however deep it goes.
 *
 * `findAll()` previously nested by hand two `include`s deep
 * (`children: { include: { children: true } } }`), which silently truncated
 * anything past a grandchild — "Electronics → Mobiles → Samsung → Galaxy S"
 * lost the fourth level with no error, because Prisma has no way to express
 * "however many levels exist" in a single query. Fetching every row once and
 * grouping by `parentId` in memory handles any depth in O(n).
 */
function buildTree<T extends TreeRow>(rows: T[]): Array<T & { children: unknown[] }> {
  const byParent = new Map<string | null, T[]>()
  for (const row of rows) {
    const list = byParent.get(row.parentId) ?? []
    list.push(row)
    byParent.set(row.parentId, list)
  }

  function attach(parentId: string | null): Array<T & { children: unknown[] }> {
    return (byParent.get(parentId) ?? []).map((row) => ({ ...row, children: attach(row.id) }))
  }

  return attach(null)
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public tree — active categories only.
   *
   * `isActive` is filtered here, not just at `findBySlug`: this is what the
   * storefront nav and shop sidebar render links from, so a row a disabled
   * parent would otherwise still surface here as a dead link that 404s when
   * clicked.
   */
  async findAll() {
    const rows = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    })
    return buildTree(rows)
  }

  /**
   * Admin tree — every status, with a product count per node.
   *
   * Deliberately a separate endpoint rather than an `includeInactive` query
   * flag on the public one: the public route carries no guard, so a flag
   * would let anyone crawl categories staff have deliberately hidden. Every
   * other admin-only read in this codebase (`/products/admin/list`,
   * `/orders/admin`) follows the same `/admin/...` split for the same reason.
   */
  async findAllAdmin() {
    const rows = await this.prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { products: true } } },
    })
    const flat = rows.map(({ _count, ...row }) => ({ ...row, productCount: _count.products }))
    return buildTree(flat)
  }

  /**
   * `isActive` is part of the lookup, not a field the caller filters on
   * afterwards — a disabled category must read as absent, exactly like
   * `products.findBySlug`. Without it the storefront rendered a category
   * staff had switched off, with its products still buyable.
   */
  async findBySlug(slug: string) {
    const cat = await this.prisma.category.findUnique({
      where: { slug, isActive: true },
      include: {
        children: { where: { isActive: true }, orderBy: { order: 'asc' } },
        parent: true,
      },
    })
    if (!cat) throw new NotFoundException(`Category ${slug} not found.`)
    return cat
  }

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { slug: dto.slug } })
    if (existing) throw new ConflictException('Slug already in use.')

    if (dto.parentId) await this.assertParentExists(dto.parentId)

    return this.prisma.category.create({
      data: {
        ...dto,
        // descEn/Ur/Ar are NOT NULL columns (mirroring Product) but a
        // description is genuinely optional for a category — a leaf category
        // often doesn't need one. Defaulting here rather than requiring it on
        // the DTO keeps that UX while guaranteeing the insert never hits the
        // column constraint and surfaces as a raw 500.
        descEn: dto.descEn ?? '',
        descUr: dto.descUr ?? '',
        descAr: dto.descAr ?? '',
      } as Prisma.CategoryUncheckedCreateInput,
    })
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.category.findUnique({ where: { id } })
    if (!cat) throw new NotFoundException('Category not found.')

    // Previously unchecked on edit — a slug rename could collide with another
    // category and fail as a raw Prisma unique-constraint error instead of a
    // message staff could act on.
    if (dto.slug && dto.slug !== cat.slug) {
      const clash = await this.prisma.category.findUnique({ where: { slug: dto.slug } })
      if (clash) throw new ConflictException('Slug already in use.')
    }

    if (dto.parentId !== undefined && dto.parentId !== cat.parentId) {
      if (dto.parentId) await this.assertParentExists(dto.parentId)
      await this.assertNotCircular(id, dto.parentId ?? null)
    }

    return this.prisma.category.update({ where: { id }, data: dto })
  }

  /**
   * Soft delete, mirroring `ProductsService.remove` (`isActive = false`)
   * rather than a real row delete.
   *
   * The previous implementation called `prisma.category.delete()` directly.
   * `Product.categoryId` has no `onDelete` clause (Prisma defaults to
   * `RESTRICT`), so deleting a category with products would have thrown an
   * unhandled foreign-key error — a raw 500, not "12 products are assigned."
   * A category with no products but with children was worse: `children` also
   * has no `onDelete`, so that case would *also* have hit `RESTRICT` — except
   * `KitCategorySource.categoryId` cascades, so a kit builder step's link to
   * this category would vanish silently in the same statement.
   */
  async remove(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { children: true, products: true } } },
    })
    if (!cat) throw new NotFoundException('Category not found.')

    if (cat._count.children > 0) {
      throw new ConflictException(
        `Cannot delete: ${cat._count.children} subcategor${cat._count.children === 1 ? 'y' : 'ies'} still nested under it. Move or delete them first.`,
      )
    }
    if (cat._count.products > 0) {
      throw new ConflictException(
        `Cannot delete: ${cat._count.products} product${cat._count.products === 1 ? '' : 's'} still assigned. Reassign them first.`,
      )
    }

    return this.prisma.category.update({ where: { id }, data: { isActive: false } })
  }

  /**
   * Persists a drag-and-drop move/reorder.
   *
   * The tree UI sends every sibling in whichever group(s) the drag touched —
   * the source parent's remaining children and the destination parent's
   * children — not only the row that moved, so `order` stays a dense 0..n-1
   * sequence on both sides. Every proposed parent is validated for existence
   * and circularity before anything is written, so a rejected move never
   * leaves some rows renumbered and others not.
   */
  async reorder(items: ReorderItem[]) {
    if (items.length === 0) return { updated: 0 }

    const ids = items.map((i) => i.id)
    const existing = await this.prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })
    const known = new Set(existing.map((c) => c.id))
    const missing = ids.filter((i) => !known.has(i))
    if (missing.length) {
      throw new BadRequestException(`Unknown category id(s): ${missing.join(', ')}`)
    }

    for (const item of items) {
      if (!item.parentId) continue
      if (item.parentId === item.id) {
        throw new BadRequestException('A category cannot be its own parent.')
      }
      if (!known.has(item.parentId)) {
        await this.assertParentExists(item.parentId)
      }
      await this.assertNotCircular(item.id, item.parentId)
    }

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.category.update({
          where: { id: item.id },
          data: { parentId: item.parentId ?? null, order: item.order },
        }),
      ),
    )

    return { updated: items.length }
  }

  /**
   * Enable/disable apply to every id in one statement. Delete does not: each
   * row needs its own children/product check, so some ids in the same batch
   * can legitimately succeed while others are blocked — the caller sees
   * exactly which and why, rather than the whole batch failing on the first
   * row that can't be removed.
   */
  async bulkAction(ids: string[], action: CategoryBulkAction) {
    if (action === 'enable' || action === 'disable') {
      const result = await this.prisma.category.updateMany({
        where: { id: { in: ids } },
        data: { isActive: action === 'enable' },
      })
      return { requested: ids.length, updated: result.count, skipped: [] as BulkSkip[] }
    }

    const rows = await this.prisma.category.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { children: true, products: true } } },
    })

    const deletableIds: string[] = []
    const skipped: BulkSkip[] = []
    for (const row of rows) {
      if (row._count.children > 0) {
        skipped.push({ id: row.id, name: row.nameEn, reason: 'has subcategories' })
      } else if (row._count.products > 0) {
        skipped.push({ id: row.id, name: row.nameEn, reason: 'has assigned products' })
      } else {
        deletableIds.push(row.id)
      }
    }

    if (deletableIds.length > 0) {
      await this.prisma.category.updateMany({
        where: { id: { in: deletableIds } },
        data: { isActive: false },
      })
    }

    return { requested: ids.length, updated: deletableIds.length, skipped }
  }

  private async assertParentExists(parentId: string) {
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true },
    })
    if (!parent) throw new BadRequestException('Unknown parent category id.')
  }

  /**
   * Walks up from the proposed parent toward the root. If that walk reaches
   * `id`, the move would nest a category inside its own descendant — nothing
   * in the schema itself prevents this, and an unguarded self-relation would
   * happily create the loop, which then recurses forever the next time
   * `findAll`/`findAllAdmin` builds a tree from it.
   */
  private async assertNotCircular(id: string, newParentId: string | null) {
    if (!newParentId) return
    if (newParentId === id) {
      throw new BadRequestException('A category cannot be its own parent.')
    }

    let cursor: string | null = newParentId
    const seen = new Set<string>()
    while (cursor) {
      if (cursor === id) {
        throw new BadRequestException('Cannot move a category under one of its own descendants.')
      }
      if (seen.has(cursor)) break // defensive: pre-existing bad data, avoid an infinite walk
      seen.add(cursor)
      const parent: { parentId: string | null } | null = await this.prisma.category.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      })
      cursor = parent?.parentId ?? null
    }
  }
}
