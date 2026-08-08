import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AdminSessionService } from '../auth/admin-session.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { CreateAddressDto } from './dto/create-address.dto'
import { Prisma } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: AdminSessionService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, phone: true, role: true, loyaltyPoints: true, createdAt: true },
    })
    if (!user) throw new NotFoundException('User not found.')
    return user
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({ where: { email: dto.email, NOT: { id } } })
      if (existing) throw new ConflictException('Email already in use.')
    }
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, name: true, email: true, phone: true, role: true, loyaltyPoints: true },
    })
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefaultShipping: 'desc' }, { createdAt: 'desc' }],
    })
  }

  /**
   * Clear whichever default flags this write is about to claim.
   *
   * Shipping and billing are demoted independently. Clearing both whenever
   * either is set would mean saving an address as the default *shipping*
   * address silently stripped the customer's default *billing* address —
   * a change they never asked for, on a row they were not editing.
   *
   * `excludeId` keeps the row being updated out of the sweep, so an update
   * cannot demote the very flag it is setting depending on statement order.
   */
  private async demoteDefaults(
    userId: string,
    dto: Partial<CreateAddressDto>,
    excludeId?: string,
  ) {
    const where: Prisma.AddressWhereInput = {
      userId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    }

    if (dto.isDefaultShipping) {
      await this.prisma.address.updateMany({ where, data: { isDefaultShipping: false } })
    }
    if (dto.isDefaultBilling) {
      await this.prisma.address.updateMany({ where, data: { isDefaultBilling: false } })
    }
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    await this.demoteDefaults(userId, dto)
    return this.prisma.address.create({
      data: { ...dto, userId } as Prisma.AddressUncheckedCreateInput,
    })
  }

  async updateAddress(id: string, userId: string, dto: Partial<CreateAddressDto>) {
    const addr = await this.prisma.address.findFirst({ where: { id, userId } })
    if (!addr) throw new NotFoundException('Address not found.')
    await this.demoteDefaults(userId, dto, id)
    return this.prisma.address.update({ where: { id }, data: dto })
  }

  async deleteAddress(id: string, userId: string) {
    const addr = await this.prisma.address.findFirst({ where: { id, userId } })
    if (!addr) throw new NotFoundException('Address not found.')
    return this.prisma.address.delete({ where: { id } })
  }

  async getWishlist(userId: string) {
    return this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            variants: { take: 1, orderBy: { price: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } })
    if (!product) throw new NotFoundException('Product not found.')
    return this.prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    })
  }

  async removeFromWishlist(userId: string, productId: string) {
    return this.prisma.wishlist.delete({ where: { userId_productId: { userId, productId } } })
  }

  // Admin
  async findAll(page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, name: true, email: true, phone: true, role: true, loyaltyPoints: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.user.count(),
    ])
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('User not found.')

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    })

    // Deactivating must take effect immediately — otherwise a disabled staff
    // member keeps working until their token expires.
    if (!updated.isActive) {
      await this.sessions.revokeAllForUser(id)
    }

    return updated
  }
}
