import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { UsersService } from './users.service'
import { PrismaService } from '../prisma/prisma.service'
import { AdminSessionService } from '../auth/admin-session.service'

/**
 * The shipping and billing defaults are two flags, not one.
 *
 * They were a single `isDefault` column, so there was nothing to get wrong.
 * Splitting them introduces a failure mode that is invisible on screen: a
 * demotion sweep that clears both whenever either is claimed silently strips
 * the customer's default billing address every time they set a delivery one,
 * on a row they were not editing.
 */
describe('UsersService — address defaults', () => {
  let service: UsersService

  const prisma = {
    address: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  }

  const sessions = { revokeAllForUser: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    prisma.address.create.mockResolvedValue({ id: 'addr-new' })
    prisma.address.update.mockResolvedValue({ id: 'addr-1' })

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AdminSessionService, useValue: sessions },
      ],
    }).compile()

    service = moduleRef.get(UsersService)
  })

  const base = {
    fullName: 'Muhammad Ali',
    phone: '+923001234567',
    addressLine1: 'House 42, Street 5',
    city: 'Lahore',
    province: 'Punjab',
  }

  /** Every `data` object passed to a demotion sweep, in call order. */
  const demotions = () => prisma.address.updateMany.mock.calls.map((c) => c[0].data)

  it('demotes only the shipping default when only shipping is claimed', async () => {
    await service.createAddress('user-1', { ...base, isDefaultShipping: true } as never)

    expect(demotions()).toEqual([{ isDefaultShipping: false }])
  })

  it('demotes only the billing default when only billing is claimed', async () => {
    await service.createAddress('user-1', { ...base, isDefaultBilling: true } as never)

    expect(demotions()).toEqual([{ isDefaultBilling: false }])
  })

  it('demotes both when both are claimed', async () => {
    await service.createAddress(
      'user-1',
      { ...base, isDefaultShipping: true, isDefaultBilling: true } as never,
    )

    expect(demotions()).toEqual([
      { isDefaultShipping: false },
      { isDefaultBilling: false },
    ])
  })

  it('does not sweep at all for an ordinary address', async () => {
    await service.createAddress('user-1', base as never)

    expect(prisma.address.updateMany).not.toHaveBeenCalled()
  })

  it('scopes every sweep to the one account', async () => {
    // Without `userId` in the where clause, Prisma reads `where: {}` and the
    // sweep clears the flag on every address row in the table.
    await service.createAddress('user-1', { ...base, isDefaultShipping: true } as never)

    expect(prisma.address.updateMany.mock.calls[0][0].where).toMatchObject({
      userId: 'user-1',
    })
  })

  it('excludes the row being updated from its own demotion sweep', async () => {
    prisma.address.findFirst.mockResolvedValue({ id: 'addr-1', userId: 'user-1' })

    await service.updateAddress('addr-1', 'user-1', { isDefaultShipping: true })

    // Otherwise the sweep and the update race on statement order, and the flag
    // the customer just set is the one that gets cleared.
    expect(prisma.address.updateMany.mock.calls[0][0].where).toMatchObject({
      userId: 'user-1',
      NOT: { id: 'addr-1' },
    })
  })

  it('refuses to update an address belonging to another account', async () => {
    prisma.address.findFirst.mockResolvedValue(null)

    await expect(
      service.updateAddress('someone-elses', 'user-1', { isDefaultShipping: true }),
    ).rejects.toBeInstanceOf(NotFoundException)

    // Nothing is swept before ownership is established, or a guessed id would
    // clear the real owner's default.
    expect(prisma.address.updateMany).not.toHaveBeenCalled()
  })

  /**
   * A PATCH distinguishes an omitted key ("leave alone") from an explicit
   * `null` ("clear it") — the same rule already enforced for `MenuItemInput`.
   * The storefront edit form sends `null` for a field the customer emptied;
   * this pins that `updateAddress` passes it straight through to Prisma
   * rather than something upstream coercing it back to `undefined`, which
   * would silently leave the old value in place.
   */
  it('clears an optional field when the caller sends null, not undefined', async () => {
    prisma.address.findFirst.mockResolvedValue({ id: 'addr-1', userId: 'user-1' })

    await service.updateAddress('addr-1', 'user-1', {
      addressLine2: null,
      area: null,
      postalCode: null,
      email: null,
    } as never)

    expect(prisma.address.update.mock.calls[0][0].data).toMatchObject({
      addressLine2: null,
      area: null,
      postalCode: null,
      email: null,
    })
  })

  it('lists the default delivery address first', async () => {
    prisma.address.findMany.mockResolvedValue([])

    await service.getAddresses('user-1')

    // Checkout prefills from the first entry, so the order here is not
    // cosmetic — it decides which address a customer sees on arrival.
    expect(prisma.address.findMany.mock.calls[0][0].orderBy).toEqual([
      { isDefaultShipping: 'desc' },
      { createdAt: 'desc' },
    ])
  })
})
