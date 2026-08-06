import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateReturnDto } from './dto/create-return.dto'
import { Prisma, ReturnStatus } from '@prisma/client'

/**
 * Window during which a delivered order can be returned. Mirrors the policy
 * shown on the storefront ("returns accepted within 7 days of delivery") —
 * a page that promises a rule the API does not enforce is worse than no page.
 */
const RETURN_WINDOW_DAYS = 7

/**
 * Legal return-status transitions for the admin moderation queue.
 *
 * `rejected` and `refunded` are terminal. `refunded` is reached only from
 * `received`, so the shop confirms the goods are back before money goes out.
 */
export const RETURN_STATUS_FLOW: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ['approved', 'rejected'],
  approved: ['received', 'rejected'],
  received: ['refunded'],
  rejected: [],
  refunded: [],
}

export function canTransitionReturn(from: ReturnStatus, to: ReturnStatus): boolean {
  return RETURN_STATUS_FLOW[from]?.includes(to) === true
}

const RETURN_INCLUDE = {
  order: {
    select: {
      id: true,
      number: true,
      total: true,
      status: true,
      createdAt: true,
      items: {
        select: { id: true, name: true, quantity: true, price: true, image: true },
      },
    },
  },
}

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Orders this customer may still open a return against.
   *
   * The storefront needs exactly this list to populate its order picker; it
   * previously listed `mockOrders`, so the dropdown showed fabricated orders
   * belonging to nobody.
   */
  async findEligibleOrders(userId: string) {
    const cutoff = new Date(Date.now() - RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000)

    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: 'delivered',
        // `deliveredAt` is not a column, so the order's last transition to
        // `delivered` is the reference point. Falling back to `createdAt`
        // would open the window before the parcel had even shipped.
        timeline: { some: { status: 'delivered', createdAt: { gte: cutoff } } },
        // One open request per order at a time.
        returns: { none: { status: { in: ['requested', 'approved', 'received'] } } },
      },
      select: {
        id: true,
        number: true,
        total: true,
        createdAt: true,
        items: { select: { id: true, name: true, quantity: true, price: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return orders
  }

  async findMine(userId: string) {
    return this.prisma.return.findMany({
      where: { order: { userId } },
      include: RETURN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(dto: CreateReturnDto, userId: string) {
    // Scoped to the caller, so a guessed order id from another account reads
    // as "not found" rather than leaking that the order exists.
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      include: {
        timeline: { where: { status: 'delivered' }, orderBy: { createdAt: 'desc' }, take: 1 },
        returns: { select: { id: true, status: true } },
      },
    })
    if (!order) throw new NotFoundException('Order not found.')

    if (order.status !== 'delivered') {
      throw new BadRequestException('Only delivered orders can be returned.')
    }

    const deliveredAt = order.timeline[0]?.createdAt
    if (!deliveredAt) {
      throw new BadRequestException('This order has no recorded delivery date.')
    }

    const daysSince = (Date.now() - deliveredAt.getTime()) / (24 * 60 * 60 * 1000)
    if (daysSince > RETURN_WINDOW_DAYS) {
      throw new BadRequestException(
        `Returns must be requested within ${RETURN_WINDOW_DAYS} days of delivery.`,
      )
    }

    const open = order.returns.find((r) =>
      ['requested', 'approved', 'received'].includes(r.status),
    )
    if (open) {
      throw new ConflictException('A return request for this order is already in progress.')
    }

    return this.prisma.return.create({
      data: {
        orderId: order.id,
        reason: dto.reason,
        note: dto.note,
        // Stored as a JSON array of URLs, matching the column's convention.
        images: dto.images?.length ? JSON.stringify(dto.images) : null,
      },
      include: RETURN_INCLUDE,
    })
  }

  async findOneForUser(id: string, userId: string) {
    const found = await this.prisma.return.findFirst({
      where: { id, order: { userId } },
      include: RETURN_INCLUDE,
    })
    if (!found) throw new NotFoundException('Return request not found.')
    return found
  }

  /**
   * Admin listing. Kept here rather than in a separate module so the window
   * and status rules stay in one place; the admin moderation UI that consumes
   * it is a later phase.
   */
  async findAll(page = 1, limit = 20, status?: ReturnStatus) {
    const where: Prisma.ReturnWhereInput = status ? { status } : {}

    const [items, total] = await Promise.all([
      this.prisma.return.findMany({
        where,
        include: RETURN_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.return.count({ where }),
    ])

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  /**
   * Admin moderation: move a return along its lifecycle
   * (approve / reject / mark received / refund), enforcing the transition
   * rules server-side rather than trusting the button the staff member clicked.
   */
  async updateStatus(id: string, status: ReturnStatus, note?: string) {
    const found = await this.prisma.return.findUnique({
      where: { id },
      include: RETURN_INCLUDE,
    })
    if (!found) throw new NotFoundException('Return request not found.')

    if (!canTransitionReturn(found.status, status)) {
      throw new BadRequestException(
        `A return that is ${found.status} cannot move to ${status}.`,
      )
    }

    return this.prisma.return.update({
      where: { id },
      // A moderation note replaces the prior note only when one is supplied,
      // so approving without a comment does not wipe the customer's reason.
      data: { status, ...(note ? { note } : {}) },
      include: RETURN_INCLUDE,
    })
  }
}
