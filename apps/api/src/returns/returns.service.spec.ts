import { Test } from '@nestjs/testing'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { ReturnsService, canTransitionReturn } from './returns.service'
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

/**
 * The `refunded` transition is the one place `Return.status` reaches beyond
 * its own row and executes a real payment refund. These pin the two rules
 * that matter most: never against an order that was not paid, and never
 * twice for the same order.
 */
describe('ReturnsService.updateStatus — the refund transition', () => {
  let service: ReturnsService

  const tx = {
    order: { updateMany: jest.fn() },
    return: { update: jest.fn() },
  }

  const prisma = {
    return: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((work: any) => work(tx)),
  }

  function returnRow(orderPaymentStatus: string, returnStatus = 'received') {
    return {
      id: 'ret-1',
      status: returnStatus,
      order: { id: 'order-1', number: 'YH-2026-1001-ABCDEF', paymentStatus: orderPaymentStatus },
    }
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    prisma.$transaction.mockImplementation((work: any) => work(tx))

    const moduleRef = await Test.createTestingModule({
      providers: [ReturnsService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = moduleRef.get(ReturnsService)
  })

  it('rejects legal return-status transitions unrelated to refunds unchanged', () => {
    // Sanity check that the flow map itself did not move.
    expect(canTransitionReturn('requested', 'approved')).toBe(true)
    expect(canTransitionReturn('received', 'refunded')).toBe(true)
    expect(canTransitionReturn('refunded', 'requested')).toBe(false)
  })

  it('never issues a refund against an unpaid order', async () => {
    prisma.return.findUnique.mockResolvedValue(returnRow('unpaid'))

    await expect(service.updateStatus('ret-1', 'refunded')).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(tx.order.updateMany).not.toHaveBeenCalled()
    expect(tx.return.update).not.toHaveBeenCalled()
  })

  it('issues the refund and moves the order payment status atomically when paid', async () => {
    prisma.return.findUnique.mockResolvedValue(returnRow('paid'))
    tx.order.updateMany.mockResolvedValue({ count: 1 })
    tx.return.update.mockResolvedValue({ id: 'ret-1', status: 'refunded' })

    await service.updateStatus('ret-1', 'refunded')

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', paymentStatus: 'paid' },
      data: { paymentStatus: 'refunded' },
    })
    expect(tx.return.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ret-1' }, data: expect.objectContaining({ status: 'refunded' }) }),
    )
  })

  it('rejects a duplicate refund when another action already refunded the order', async () => {
    // The read saw `paid`, but the order was refunded by a concurrent action
    // (or the direct payment-status endpoint) between the read and this call.
    prisma.return.findUnique.mockResolvedValue(returnRow('paid'))
    tx.order.updateMany.mockResolvedValue({ count: 0 })

    await expect(service.updateStatus('ret-1', 'refunded')).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(tx.return.update).not.toHaveBeenCalled()
  })

  it('does not touch the order at all for a non-refund transition', async () => {
    prisma.return.findUnique.mockResolvedValue(returnRow('unpaid', 'requested'))
    prisma.return.update.mockResolvedValue({ id: 'ret-1', status: 'approved' })

    await service.updateStatus('ret-1', 'approved')

    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.return.update).toHaveBeenCalled()
  })
})
