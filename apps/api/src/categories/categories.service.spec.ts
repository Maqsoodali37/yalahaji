import { Test } from '@nestjs/testing'
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { CategoriesService } from './categories.service'
import { PrismaService } from '../prisma/prisma.service'

/**
 * The storefront turns a null category into a 404 page. These tests pin the
 * two things that decision depends on: the lookup must exclude disabled rows,
 * and a miss must be a 404 rather than a resolved-but-empty response.
 */
describe('CategoriesService.findBySlug', () => {
  let service: CategoriesService

  const prisma = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = moduleRef.get(CategoriesService)
  })

  it('scopes the lookup to active categories', async () => {
    // Prevents: a category staff switched off still rendering a shop page,
    // with its products still buyable, because `isActive` was filtered nowhere.
    prisma.category.findUnique.mockResolvedValue({ id: 'c1', slug: 'ihram', children: [] })

    await service.findBySlug('ihram')

    expect(prisma.category.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'ihram', isActive: true } }),
    )
  })

  it('hides disabled children from the returned tree', async () => {
    // Prevents: the shop sidebar linking to a disabled subcategory that then
    // 404s — a dead link the customer has no way to predict.
    prisma.category.findUnique.mockResolvedValue({ id: 'c1', slug: 'ihram', children: [] })

    await service.findBySlug('ihram')

    const arg = prisma.category.findUnique.mock.calls[0][0] as {
      include: { children: { where: unknown } }
    }
    expect(arg.include.children.where).toEqual({ isActive: true })
  })

  it('throws 404 for an unknown slug rather than returning null', async () => {
    // Prevents: a 200 carrying null reaching the storefront adapter, which
    // reads fields off it and crashes the render instead of showing a 404.
    prisma.category.findUnique.mockResolvedValue(null)

    await expect(service.findBySlug('does-not-exist')).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })
})

/**
 * `findAll` used to nest two `include`s deep and silently drop anything past
 * a grandchild. These pin the replacement: it fetches the whole table flat and
 * groups by `parentId`, so depth is unbounded, and it must still exclude
 * disabled rows the way the old query did via `where: { isActive: true }`.
 */
describe('CategoriesService.findAll', () => {
  let service: CategoriesService

  const prisma = {
    category: { findMany: jest.fn() },
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile()
    service = moduleRef.get(CategoriesService)
  })

  it('nests four levels deep, not just two', async () => {
    // Prevents: "Electronics → Mobiles → Samsung → Galaxy S" losing its
    // fourth level because the query only ever asked for grandchildren.
    prisma.category.findMany.mockResolvedValue([
      { id: 'a', parentId: null, _count: { products: 0 } },
      { id: 'b', parentId: 'a', _count: { products: 0 } },
      { id: 'c', parentId: 'b', _count: { products: 0 } },
      { id: 'd', parentId: 'c', _count: { products: 0 } },
    ])

    const tree = await service.findAll()

    expect(tree).toEqual([
      {
        id: 'a',
        parentId: null,
        productCount: 0,
        children: [
          {
            id: 'b',
            parentId: 'a',
            productCount: 0,
            children: [
              {
                id: 'c',
                parentId: 'b',
                productCount: 0,
                children: [{ id: 'd', parentId: 'c', productCount: 0, children: [] }],
              },
            ],
          },
        ],
      },
    ])
  })

  it('only ever asks Prisma for active rows', async () => {
    prisma.category.findMany.mockResolvedValue([])
    await service.findAll()
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    )
  })

  it('counts only active products per category, not every assigned product', async () => {
    // Prevents: the home page and shop sidebar showing a category as having
    // products when every product assigned to it is disabled — the category
    // itself would read as active while everything inside it is unbuyable.
    prisma.category.findMany.mockResolvedValue([
      { id: 'a', parentId: null, _count: { products: 3 } },
    ])

    const tree = await service.findAll()

    expect(tree[0].productCount).toBe(3)
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { _count: { select: { products: { where: { isActive: true } } } } },
      }),
    )
  })
})

describe('CategoriesService.remove', () => {
  let service: CategoriesService

  const prisma = {
    category: { findUnique: jest.fn(), update: jest.fn() },
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile()
    service = moduleRef.get(CategoriesService)
  })

  it('refuses to delete a category with subcategories', async () => {
    // Prevents: the old `prisma.category.delete()` hitting a foreign-key
    // RESTRICT at the database and surfacing as a raw 500 instead of a
    // message staff can act on.
    prisma.category.findUnique.mockResolvedValue({
      id: 'c1',
      _count: { children: 2, products: 0 },
    })

    await expect(service.remove('c1')).rejects.toBeInstanceOf(ConflictException)
    expect(prisma.category.update).not.toHaveBeenCalled()
  })

  it('refuses to delete a category with assigned products', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'c1',
      _count: { children: 0, products: 3 },
    })

    await expect(service.remove('c1')).rejects.toBeInstanceOf(ConflictException)
    expect(prisma.category.update).not.toHaveBeenCalled()
  })

  it('soft-deletes by setting isActive=false, mirroring ProductsService', async () => {
    // Prevents a real row delete, which would also silently cascade-drop this
    // category's KitCategorySource links (that FK cascades; children and
    // products do not).
    prisma.category.findUnique.mockResolvedValue({
      id: 'c1',
      _count: { children: 0, products: 0 },
    })

    await service.remove('c1')

    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { isActive: false },
    })
  })
})

describe('CategoriesService.update — circular hierarchy guard', () => {
  let service: CategoriesService

  const prisma = {
    category: { findUnique: jest.fn(), update: jest.fn() },
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile()
    service = moduleRef.get(CategoriesService)
  })

  it('rejects a category becoming its own parent', async () => {
    prisma.category.findUnique
      .mockResolvedValueOnce({ id: 'a', slug: 'a', parentId: null }) // the row being updated
      .mockResolvedValueOnce({ id: 'a' }) // assertParentExists('a') — it exists, it's itself

    await expect(service.update('a', { parentId: 'a' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(prisma.category.update).not.toHaveBeenCalled()
  })

  it('rejects nesting a category under its own descendant', async () => {
    // a → b → c exists; moving `a` under `c` would create a → b → c → a.
    prisma.category.findUnique
      .mockResolvedValueOnce({ id: 'a', slug: 'a', parentId: null }) // the row being updated
      .mockResolvedValueOnce({ id: 'c', parentId: null }) // assertParentExists('c')
      .mockResolvedValueOnce({ parentId: 'b' }) // walk: c's parent
      .mockResolvedValueOnce({ parentId: 'a' }) // walk: b's parent — hits `a`

    await expect(service.update('a', { parentId: 'c' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(prisma.category.update).not.toHaveBeenCalled()
  })

  it('allows moving to an unrelated parent', async () => {
    prisma.category.findUnique
      .mockResolvedValueOnce({ id: 'a', slug: 'a', parentId: null })
      .mockResolvedValueOnce({ id: 'z', parentId: null }) // assertParentExists('z')
      .mockResolvedValueOnce({ parentId: null }) // walk from z: reaches root, no match

    await service.update('a', { parentId: 'z' })

    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { parentId: 'z' },
    })
  })
})

describe('CategoriesService.update — slug uniqueness', () => {
  let service: CategoriesService

  const prisma = {
    category: { findUnique: jest.fn(), update: jest.fn() },
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile()
    service = moduleRef.get(CategoriesService)
  })

  it('rejects renaming the slug to one already in use', async () => {
    // Prevents: an edit hitting the `slug` unique constraint as a raw
    // driver-level error, which `create()` already guarded against but
    // `update()` never did.
    prisma.category.findUnique
      .mockResolvedValueOnce({ id: 'a', slug: 'old-slug', parentId: null })
      .mockResolvedValueOnce({ id: 'b', slug: 'new-slug' })

    await expect(service.update('a', { slug: 'new-slug' })).rejects.toBeInstanceOf(
      ConflictException,
    )
    expect(prisma.category.update).not.toHaveBeenCalled()
  })
})

describe('CategoriesService.reorder', () => {
  let service: CategoriesService

  const prisma = {
    category: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    prisma.$transaction.mockImplementation((ops: unknown[]) => Promise.all(ops))
    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile()
    service = moduleRef.get(CategoriesService)
  })

  it('rejects an id that does not exist rather than writing a partial batch', async () => {
    prisma.category.findMany.mockResolvedValue([{ id: 'a' }]) // 'ghost' missing

    await expect(
      service.reorder([
        { id: 'a', parentId: null, order: 0 },
        { id: 'ghost', parentId: null, order: 1 },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects a drop that would nest a category under its own descendant', async () => {
    // a → b exists; the drag would move `a` under `b`.
    prisma.category.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }])
    prisma.category.findUnique.mockResolvedValueOnce({ parentId: 'a' }) // walk: b's parent is a

    await expect(
      service.reorder([{ id: 'a', parentId: 'b', order: 0 }]),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('writes every affected row in a single transaction', async () => {
    prisma.category.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }])

    const result = await service.reorder([
      { id: 'a', parentId: null, order: 0 },
      { id: 'b', parentId: null, order: 1 },
    ])

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ updated: 2 })
  })
})

describe('CategoriesService.bulkAction', () => {
  let service: CategoriesService

  const prisma = {
    category: { findMany: jest.fn(), updateMany: jest.fn() },
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile()
    service = moduleRef.get(CategoriesService)
  })

  it('deletes what it can and reports what it skipped, in the same batch', async () => {
    // Prevents an all-or-nothing bulk delete: one un-deletable row in a
    // 50-row selection should not block the other 49.
    prisma.category.findMany.mockResolvedValue([
      { id: 'ok', nameEn: 'Empty leaf', _count: { children: 0, products: 0 } },
      { id: 'has-kids', nameEn: 'Has children', _count: { children: 2, products: 0 } },
      { id: 'has-products', nameEn: 'Has products', _count: { children: 0, products: 5 } },
    ])
    prisma.category.updateMany.mockResolvedValue({ count: 1 })

    const result = await service.bulkAction(['ok', 'has-kids', 'has-products'], 'delete')

    expect(prisma.category.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['ok'] } },
      data: { isActive: false },
    })
    expect(result.updated).toBe(1)
    expect(result.skipped).toEqual([
      { id: 'has-kids', name: 'Has children', reason: 'has subcategories' },
      { id: 'has-products', name: 'Has products', reason: 'has assigned products' },
    ])
  })

  it('enables or disables the whole batch in one statement', async () => {
    prisma.category.updateMany.mockResolvedValue({ count: 3 })

    const result = await service.bulkAction(['a', 'b', 'c'], 'enable')

    expect(prisma.category.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b', 'c'] } },
      data: { isActive: true },
    })
    expect(result).toEqual({ requested: 3, updated: 3, skipped: [] })
  })
})
