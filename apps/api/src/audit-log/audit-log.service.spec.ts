import { Test } from '@nestjs/testing'
import { Prisma } from '@prisma/client'
import { AuditLogService } from './audit-log.service'
import { PrismaService } from '../prisma/prisma.service'

const ACTOR = { id: 'staff-1', name: 'Ayesha', role: 'admin', ip: '203.0.113.4' }

describe('AuditLogService', () => {
  let service: AuditLogService

  const prisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const moduleRef = await Test.createTestingModule({
      providers: [AuditLogService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = moduleRef.get(AuditLogService)
  })

  describe('record', () => {
    it('writes the actor, action and before/after state', async () => {
      prisma.auditLog.create.mockResolvedValue({})

      await service.record({
        actor: ACTOR,
        action: 'update',
        entityType: 'Setting',
        entityId: 'currency_symbol',
        before: { value: '₨' },
        after: { value: '$' },
      })

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: ACTOR.id,
          actorName: ACTOR.name,
          actorRole: ACTOR.role,
          ipAddress: ACTOR.ip,
          action: 'update',
          entityType: 'Setting',
          entityId: 'currency_symbol',
          before: { value: '₨' },
          after: { value: '$' },
        },
      })
    })

    it('stores SQL NULL, not the missing key, for an omitted before/after', async () => {
      prisma.auditLog.create.mockResolvedValue({})

      await service.record({
        actor: ACTOR,
        action: 'create',
        entityType: 'Setting',
        entityId: 'x',
        after: { value: '1' },
      })

      const data = prisma.auditLog.create.mock.calls[0][0].data
      expect(data.before).toBe(Prisma.JsonNull)
      expect(data.after).toEqual({ value: '1' })
    })

    it('never throws — a logging failure must not fail the mutation it records', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('db down'))

      await expect(
        service.record({ actor: ACTOR, action: 'delete', entityType: 'Setting', entityId: 'x' }),
      ).resolves.toBeUndefined()
    })
  })

  describe('findAll', () => {
    it('narrows by entity when given one', async () => {
      prisma.auditLog.findMany.mockResolvedValue([])
      prisma.auditLog.count.mockResolvedValue(0)

      await service.findAll({ entityType: 'Setting', entityId: 'currency_symbol' })

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'Setting', entityId: 'currency_symbol' },
        }),
      )
    })

    it('clamps an out-of-range limit to the default rather than trusting the caller', async () => {
      prisma.auditLog.findMany.mockResolvedValue([])
      prisma.auditLog.count.mockResolvedValue(0)

      await service.findAll({ limit: 500 })

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }))
    })

    it('paginates from the total count', async () => {
      prisma.auditLog.findMany.mockResolvedValue([])
      prisma.auditLog.count.mockResolvedValue(45)

      const result = await service.findAll({ page: 2, limit: 20 })

      expect(result.meta).toEqual({ total: 45, page: 2, limit: 20, totalPages: 3 })
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20 }))
    })
  })
})
