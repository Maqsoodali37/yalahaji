import { Test } from '@nestjs/testing'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { KitCategoriesService } from './kit-categories.service'
import { PrismaService } from '../prisma/prisma.service'

describe('KitCategoriesService', () => {
  let service: KitCategoriesService

  const prisma = {
    kitCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    kitCategorySource: { deleteMany: jest.fn(), createMany: jest.fn() },
    category: { findMany: jest.fn() },
    product: { findMany: jest.fn() },
    $transaction: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const moduleRef = await Test.createTestingModule({
      providers: [KitCategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = moduleRef.get(KitCategoriesService)
  })

  function step(overrides: Record<string, unknown> = {}) {
    return {
      id: 'kit-1',
      slug: 'ihram',
      nameEn: 'Ihram',
      nameUr: 'احرام',
      nameAr: 'الإحرام',
      icon: '🤍',
      required: true,
      order: 1,
      isActive: true,
      sources: [{ categoryId: 'cat-1', category: { id: 'cat-1', slug: 'ihram', nameEn: 'Ihram' } }],
      ...overrides,
    }
  }

  describe('findAll', () => {
    it('resolves products through each step’s linked categories', async () => {
      prisma.kitCategory.findMany.mockResolvedValue([step()])
      prisma.product.findMany.mockResolvedValue([
        { id: 'p-1', category: { id: 'cat-1' } },
        { id: 'p-2', category: { id: 'cat-1' } },
      ])

      const result = await service.findAll()

      expect(result).toHaveLength(1)
      expect(result[0].products.map((p) => p.id)).toEqual(['p-1', 'p-2'])
      expect(result[0].categorySlugs).toEqual(['ihram'])
    })

    it('excludes kits, so a kit cannot be nested inside another kit', async () => {
      prisma.kitCategory.findMany.mockResolvedValue([step()])
      prisma.product.findMany.mockResolvedValue([])

      await service.findAll()

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isKit: false, isActive: true }),
        }),
      )
    })

    it('drops steps with no purchasable products from the public listing', async () => {
      // A required step a customer cannot fill blocks the whole flow.
      prisma.kitCategory.findMany.mockResolvedValue([step()])
      prisma.product.findMany.mockResolvedValue([])

      await expect(service.findAll()).resolves.toEqual([])
    })

    it('keeps empty steps for the admin listing', async () => {
      prisma.kitCategory.findMany.mockResolvedValue([step()])
      prisma.product.findMany.mockResolvedValue([])

      const result = await service.findAll(true)

      expect(result).toHaveLength(1)
      expect(result[0].products).toEqual([])
    })

    it('queries products once rather than once per step', async () => {
      prisma.kitCategory.findMany.mockResolvedValue([
        step(),
        step({ id: 'kit-2', slug: 'prayer', sources: [{ categoryId: 'cat-2', category: { id: 'cat-2', slug: 'prayer', nameEn: 'Prayer' } }] }),
      ])
      prisma.product.findMany.mockResolvedValue([{ id: 'p-1', category: { id: 'cat-1' } }])

      await service.findAll(true)

      expect(prisma.product.findMany).toHaveBeenCalledTimes(1)
    })

    it('does not query products at all when there are no steps', async () => {
      prisma.kitCategory.findMany.mockResolvedValue([])

      await expect(service.findAll()).resolves.toEqual([])
      expect(prisma.product.findMany).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    const dto = {
      slug: 'ihram',
      nameEn: 'Ihram',
      nameUr: 'احرام',
      nameAr: 'الإحرام',
      categoryIds: ['cat-1'],
    }

    it('rejects a slug that is already in use', async () => {
      prisma.kitCategory.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException)
      expect(prisma.kitCategory.create).not.toHaveBeenCalled()
    })

    it('names the unknown category ids rather than failing on the foreign key', async () => {
      prisma.kitCategory.findUnique.mockResolvedValue(null)
      prisma.category.findMany.mockResolvedValue([]) // neither id exists

      await expect(
        service.create({ ...dto, categoryIds: ['cat-missing', 'cat-also-missing'] }),
      ).rejects.toThrow(/cat-missing, cat-also-missing/)
    })

    it('links the categories in the order they were supplied', async () => {
      prisma.kitCategory.findUnique.mockResolvedValue(null)
      prisma.category.findMany.mockResolvedValue([{ id: 'cat-1' }, { id: 'cat-2' }])
      prisma.kitCategory.create.mockResolvedValue({ id: 'kit-1' })

      await service.create({ ...dto, categoryIds: ['cat-2', 'cat-1'] })

      expect(prisma.kitCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sources: {
              create: [
                { categoryId: 'cat-2', order: 0 },
                { categoryId: 'cat-1', order: 1 },
              ],
            },
          }),
        }),
      )
    })
  })

  describe('remove', () => {
    it('404s on an unknown id', async () => {
      prisma.kitCategory.findUnique.mockResolvedValue(null)

      await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.kitCategory.delete).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('rejects unknown category ids before touching the links', async () => {
      prisma.kitCategory.findUnique.mockResolvedValue({ id: 'kit-1', slug: 'ihram' })
      prisma.category.findMany.mockResolvedValue([])

      await expect(
        service.update('kit-1', { categoryIds: ['cat-missing'] }),
      ).rejects.toBeInstanceOf(BadRequestException)

      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })
})
