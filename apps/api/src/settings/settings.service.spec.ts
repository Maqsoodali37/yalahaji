import { Test } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { SettingsService } from './settings.service'
import { PrismaService } from '../prisma/prisma.service'
import { AuditLogService } from '../audit-log/audit-log.service'

const ACTOR = { id: 'staff-1', name: 'Ayesha', role: 'admin', ip: '203.0.113.4' }

function row(over: Partial<Record<string, unknown>> & { key: string; value: string }) {
  return {
    valueType: 'string',
    category: 'general',
    description: null,
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

describe('SettingsService', () => {
  let service: SettingsService

  const prisma = {
    setting: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }

  // Typed explicitly so `mockResolvedValue` accepts a cached payload and
  // `mock.calls` is indexable — inferring from `async () => undefined` gives
  // both a `Promise<undefined>` and an empty-tuple argument list.
  const cache = {
    get: jest.fn<Promise<unknown>, [string]>(),
    set: jest.fn<Promise<void>, [string, unknown, number?]>(),
    del: jest.fn<Promise<void>, [string]>(),
  }

  const auditLog = {
    record: jest.fn<Promise<void>, [unknown]>(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(undefined)
    auditLog.record.mockResolvedValue(undefined)

    const moduleRef = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile()

    service = moduleRef.get(SettingsService)
  })

  describe('findPublic', () => {
    it('coerces each value to its declared type', async () => {
      prisma.setting.findMany.mockResolvedValue([
        row({ key: 'store_name', value: 'Yala Haji', valueType: 'string', isPublic: true }),
        row({ key: 'free_shipping_threshold', value: '299900', valueType: 'number', isPublic: true }),
        row({ key: 'coupon_enabled', value: 'true', valueType: 'boolean', isPublic: true }),
        row({ key: 'banner', value: '{"text":"Eid sale"}', valueType: 'json', isPublic: true }),
      ])

      const result = await service.findPublic()

      expect(result).toEqual({
        store_name: 'Yala Haji',
        free_shipping_threshold: 299900,
        coupon_enabled: true,
        banner: { text: 'Eid sale' },
      })
    })

    it('queries only rows flagged public', async () => {
      // The guarantee that replaced the hardcoded allowlist: a key an admin
      // adds is private unless deliberately published.
      prisma.setting.findMany.mockResolvedValue([])

      await service.findPublic()

      expect(prisma.setting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublic: true } }),
      )
    })

    it('degrades a corrupt value rather than throwing', async () => {
      // Staff can put anything in these rows; a bad one must not take the
      // whole storefront down.
      prisma.setting.findMany.mockResolvedValue([
        row({ key: 'tax_percentage', value: 'abc', valueType: 'number', isPublic: true }),
        row({ key: 'banner', value: 'not json', valueType: 'json', isPublic: true }),
      ])

      await expect(service.findPublic()).resolves.toEqual({ tax_percentage: 0, banner: {} })
    })

    it('serves from cache without hitting the database', async () => {
      cache.get.mockResolvedValue({ store_name: 'Cached' })

      await expect(service.findPublic()).resolves.toEqual({ store_name: 'Cached' })
      expect(prisma.setting.findMany).not.toHaveBeenCalled()
    })

    it('still answers when the cache is unavailable', async () => {
      // A Redis blip should cost a round trip to MySQL, not a 500.
      cache.get.mockRejectedValue(new Error('redis down'))
      prisma.setting.findMany.mockResolvedValue([
        row({ key: 'store_name', value: 'Yala Haji', isPublic: true }),
      ])

      await expect(service.findPublic()).resolves.toEqual({ store_name: 'Yala Haji' })
    })
  })

  describe('typed reads', () => {
    it('falls back when a key is missing', async () => {
      prisma.setting.findUnique.mockResolvedValue(null)

      // The fallback matters: a threshold coerced to 0 would make all
      // shipping free.
      await expect(service.getNumber('free_shipping_threshold', 299900)).resolves.toBe(299900)
      await expect(service.getBoolean('cod_enabled', true)).resolves.toBe(true)
      await expect(service.getString('currency_symbol', '₨')).resolves.toBe('₨')
    })

    it('falls back when a number is unparseable rather than returning NaN', async () => {
      prisma.setting.findUnique.mockResolvedValue(row({ key: 'x', value: 'oops' }))

      await expect(service.getNumber('x', 42)).resolves.toBe(42)
    })

    it('reads several boolean spellings', async () => {
      prisma.setting.findUnique.mockResolvedValue(row({ key: 'flag', value: '1' }))
      await expect(service.getBoolean('flag', false)).resolves.toBe(true)

      prisma.setting.findUnique.mockResolvedValue(row({ key: 'flag', value: 'false' }))
      await expect(service.getBoolean('flag', true)).resolves.toBe(false)
    })
  })

  describe('create', () => {
    it('rejects a duplicate key', async () => {
      prisma.setting.findUnique.mockResolvedValue(row({ key: 'currency', value: 'PKR' }))

      await expect(
        service.create({ key: 'currency', value: 'USD', valueType: 'string' } as never, ACTOR),
      ).rejects.toBeInstanceOf(ConflictException)
    })

    it('rejects a value that does not match its declared type', async () => {
      // Caught on save rather than surfacing later inside an unrelated checkout.
      prisma.setting.findUnique.mockResolvedValue(null)

      await expect(
        service.create({ key: 'tax_percentage', value: 'abc', valueType: 'number' } as never, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException)

      await expect(
        service.create({ key: 'flag', value: 'yes', valueType: 'boolean' } as never, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException)

      await expect(
        service.create({ key: 'banner', value: '{nope', valueType: 'json' } as never, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('defaults a new key to private', async () => {
      prisma.setting.findUnique.mockResolvedValue(null)
      prisma.setting.create.mockResolvedValue(row({ key: 'x', value: '1' }))

      await service.create({ key: 'x', value: '1', valueType: 'number' } as never, ACTOR)

      expect(prisma.setting.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isPublic: false }) }),
      )
    })

    it('records an audit entry with the created row and no "before" state', async () => {
      prisma.setting.findUnique.mockResolvedValue(null)
      const created = row({ key: 'x', value: '1' })
      prisma.setting.create.mockResolvedValue(created)

      await service.create({ key: 'x', value: '1', valueType: 'number' } as never, ACTOR)

      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: ACTOR,
          action: 'create',
          entityType: 'Setting',
          entityId: 'x',
          after: created,
        }),
      )
    })

    it('does not record an audit entry when the create is rejected', async () => {
      prisma.setting.findUnique.mockResolvedValue(row({ key: 'currency', value: 'PKR' }))

      await expect(
        service.create({ key: 'currency', value: 'USD', valueType: 'string' } as never, ACTOR),
      ).rejects.toBeInstanceOf(ConflictException)

      expect(auditLog.record).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('validates the value against the existing type when only the value changes', async () => {
      prisma.setting.findUnique.mockResolvedValue(
        row({ key: 'tax_percentage', value: '17', valueType: 'number' }),
      )

      await expect(
        service.update('tax_percentage', { value: 'abc' }, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('404s on an unknown key', async () => {
      prisma.setting.findUnique.mockResolvedValue(null)

      await expect(service.update('nope', { value: '1' }, ACTOR)).rejects.toBeInstanceOf(
        NotFoundException,
      )
    })

    it('invalidates the aggregate caches, not just the single key', async () => {
      // Otherwise an admin's own edit appears to have had no effect.
      prisma.setting.findUnique.mockResolvedValue(row({ key: 'currency_symbol', value: '₨' }))
      prisma.setting.update.mockResolvedValue(row({ key: 'currency_symbol', value: '$' }))

      await service.update('currency_symbol', { value: '$' }, ACTOR)

      const deleted = cache.del.mock.calls.map((c) => c[0])
      expect(deleted).toEqual(
        expect.arrayContaining(['config:key:currency_symbol', 'config:public', 'config:all']),
      )
    })

    it('records an audit entry carrying both the before and after state', async () => {
      const before = row({ key: 'currency_symbol', value: '₨' })
      const after = row({ key: 'currency_symbol', value: '$' })
      prisma.setting.findUnique.mockResolvedValue(before)
      prisma.setting.update.mockResolvedValue(after)

      await service.update('currency_symbol', { value: '$' }, ACTOR)

      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: ACTOR,
          action: 'update',
          entityType: 'Setting',
          entityId: 'currency_symbol',
          before,
          after,
        }),
      )
    })
  })

  describe('remove', () => {
    it('404s on an unknown key', async () => {
      prisma.setting.findUnique.mockResolvedValue(null)

      await expect(service.remove('nope', ACTOR)).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.setting.delete).not.toHaveBeenCalled()
      expect(auditLog.record).not.toHaveBeenCalled()
    })

    it('records an audit entry with the removed row as "before" and no "after"', async () => {
      const existing = row({ key: 'x', value: '1' })
      prisma.setting.findUnique.mockResolvedValue(existing)
      prisma.setting.delete.mockResolvedValue(existing)

      await service.remove('x', ACTOR)

      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: ACTOR,
          action: 'delete',
          entityType: 'Setting',
          entityId: 'x',
          before: existing,
        }),
      )
      expect(auditLog.record.mock.calls[0][0]).not.toHaveProperty('after')
    })
  })
})
