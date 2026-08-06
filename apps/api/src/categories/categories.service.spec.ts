import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
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
      delete: jest.fn(),
    },
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
    // with its products buyable, because `isActive` was filtered nowhere.
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
