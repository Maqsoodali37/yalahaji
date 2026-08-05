import { Test } from '@nestjs/testing'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { ReturnsService } from './returns.service'
import { PrismaService } from '../prisma/prisma.service'

const DAY = 24 * 60 * 60 * 1000

function daysAgo(n: number) {
  return new Date(Date.now() - n * DAY)
}

describe('ReturnsService.create', () => {
  let service: ReturnsService

  const prisma = {
    order: { findFirst: jest.fn(), findMany: jest.fn() },
    return: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const moduleRef = await Test.createTestingModule({
      providers: [ReturnsService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = moduleRef.get(ReturnsService)
  })

  const dto = { orderId: 'order-1', reason: 'Damaged/defective item' }

  /** A delivered order, delivered `n` days ago, with no open return. */
  function deliveredOrder(n: number, returns: Array<{ id: string; status: string }> = []) {
    return {
      id: 'order-1',
      status: 'delivered',
      timeline: [{ createdAt: daysAgo(n) }],
      returns,
    }
  }

  it('creates a return for an order delivered inside the window', async () => {
    prisma.order.findFirst.mockResolvedValue(deliveredOrder(2))
    prisma.return.create.mockResolvedValue({ id: 'ret-1' })

    await service.create(dto, 'user-1')

    expect(prisma.return.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderId: 'order-1', reason: dto.reason }),
      }),
    )
  })

  it('scopes the order lookup to the caller', async () => {
    // A guessed id from another account must read as "not found" rather than
    // confirming that the order exists.
    prisma.order.findFirst.mockResolvedValue(null)

    await expect(service.create(dto, 'user-1')).rejects.toBeInstanceOf(NotFoundException)

    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'order-1', userId: 'user-1' }),
      }),
    )
  })

  it('rejects an order that has not been delivered', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'order-1',
      status: 'shipped',
      timeline: [],
      returns: [],
    })

    await expect(service.create(dto, 'user-1')).rejects.toThrow(/Only delivered orders/)
    expect(prisma.return.create).not.toHaveBeenCalled()
  })

  it('rejects an order delivered outside the 7-day window', async () => {
    prisma.order.findFirst.mockResolvedValue(deliveredOrder(9))

    await expect(service.create(dto, 'user-1')).rejects.toThrow(/within 7 days/)
    expect(prisma.return.create).not.toHaveBeenCalled()
  })

  it('accepts an order delivered exactly inside the boundary', async () => {
    // Six days is unambiguously inside; asserts the comparison is not
    // off by a day in the strict direction.
    prisma.order.findFirst.mockResolvedValue(deliveredOrder(6))
    prisma.return.create.mockResolvedValue({ id: 'ret-1' })

    await expect(service.create(dto, 'user-1')).resolves.toBeDefined()
  })

  it('rejects a second request while one is already in progress', async () => {
    prisma.order.findFirst.mockResolvedValue(
      deliveredOrder(1, [{ id: 'ret-existing', status: 'requested' }]),
    )

    await expect(service.create(dto, 'user-1')).rejects.toBeInstanceOf(ConflictException)
  })

  it('allows a new request when the previous one was rejected', async () => {
    prisma.order.findFirst.mockResolvedValue(
      deliveredOrder(1, [{ id: 'ret-old', status: 'rejected' }]),
    )
    prisma.return.create.mockResolvedValue({ id: 'ret-2' })

    await expect(service.create(dto, 'user-1')).resolves.toBeDefined()
  })

  it('rejects an order with no recorded delivery date', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'order-1',
      status: 'delivered',
      timeline: [],
      returns: [],
    })

    await expect(service.create(dto, 'user-1')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('stores images as a JSON array and omits the column when there are none', async () => {
    prisma.order.findFirst.mockResolvedValue(deliveredOrder(1))
    prisma.return.create.mockResolvedValue({ id: 'ret-1' })

    await service.create({ ...dto, images: ['https://cdn.test/a.jpg'] }, 'user-1')
    expect(prisma.return.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ images: '["https://cdn.test/a.jpg"]' }),
      }),
    )

    jest.clearAllMocks()
    prisma.order.findFirst.mockResolvedValue(deliveredOrder(1))
    prisma.return.create.mockResolvedValue({ id: 'ret-2' })

    await service.create(dto, 'user-1')
    expect(prisma.return.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ images: null }) }),
    )
  })
})
