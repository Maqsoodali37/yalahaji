import { Test } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { OrdersService, canTransitionOrder, canTransitionPaymentStatus } from './orders.service'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'
import { CreateOrderDto } from './dto/create-order.dto'

/**
 * Covers the guards added to `create()`. These are the rules that a bad
 * request has to fail *before* any stock is decremented or an address row is
 * written, so they are asserted against a Prisma double that would throw if
 * the service got as far as touching it.
 */
describe('OrdersService.create — request guards', () => {
  let service: OrdersService

  const prisma = {
    order: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    address: { findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    productVariant: { findUnique: jest.fn() },
    coupon: { findFirst: jest.fn() },
    setting: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  }

  // Shop configuration, stubbed to the seeded defaults. Each test that cares
  // about a specific config overrides the relevant call.
  const settings = {
    getNumber: jest.fn(async (_key: string, fallback: number) => fallback),
    getBoolean: jest.fn(async (_key: string, fallback: boolean) => fallback),
    getString: jest.fn(async (_key: string, fallback: string) => fallback),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    settings.getNumber.mockImplementation(async (_key, fallback) => fallback)
    settings.getBoolean.mockImplementation(async (_key, fallback) => fallback)
    // clearAllMocks() clears calls but keeps implementations, so a test that
    // stubbed $transaction would otherwise leak its transaction double into
    // every later test in the file.
    prisma.$transaction.mockReset()

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: settings },
      ],
    }).compile()

    service = moduleRef.get(OrdersService)
  })

  const validItems = [{ variantId: 'v-1', quantity: 1 }]

  function dto(overrides: Partial<CreateOrderDto> = {}): CreateOrderDto {
    return {
      items: validItems,
      paymentMethod: 'cod',
      address: {
        fullName: 'Muhammad Ali',
        phone: '+923001234567',
        addressLine1: 'House 42, Street 5',
        city: 'Lahore',
        province: 'Punjab',
      },
      ...overrides,
    } as CreateOrderDto
  }

  it('rejects a guest order with no phone and no email', async () => {
    // Tracking no longer matches on these fields — the order number carries
    // its own token — but the requirement stands for a different reason:
    // a COD courier needs a number to call, and support has no way to reach
    // the buyer about a failed delivery without one.
    await expect(service.create(dto(), undefined)).rejects.toBeInstanceOf(BadRequestException)

    expect(prisma.address.create).not.toHaveBeenCalled()
    expect(prisma.productVariant.findUnique).not.toHaveBeenCalled()
  })

  it('accepts a guest order that supplies a phone number', async () => {
    prisma.address.create.mockResolvedValue({ id: 'addr-1' })
    prisma.productVariant.findUnique.mockResolvedValue(null) // fail fast after the guard

    await expect(
      service.create(dto({ guestPhone: '+923001234567' }), undefined),
    ).rejects.toThrow(/Variant v-1 not found/)

    // Getting as far as the variant lookup proves the contact guard passed.
    expect(prisma.productVariant.findUnique).toHaveBeenCalled()
  })

  it('does not require guest contact details from a signed-in customer', async () => {
    prisma.address.create.mockResolvedValue({ id: 'addr-1' })
    prisma.productVariant.findUnique.mockResolvedValue(null)

    await expect(service.create(dto(), 'user-1')).rejects.toThrow(/Variant v-1 not found/)
  })

  it('rejects the same variant appearing on two lines', async () => {
    // Each line passes the per-line stock check while together exceeding
    // stock, and they would be written as duplicate rows.
    const duplicated = dto({
      guestPhone: '+923001234567',
      items: [
        { variantId: 'v-1', quantity: 1 },
        { variantId: 'v-1', quantity: 5 },
      ],
    })

    await expect(service.create(duplicated, undefined)).rejects.toThrow(
      /appears more than once/,
    )
    expect(prisma.productVariant.findUnique).not.toHaveBeenCalled()
  })

  it('rejects an order whose address belongs to another account', async () => {
    prisma.address.findFirst.mockResolvedValue(null)

    const withAddressId = dto({ addressId: 'someone-elses-address', address: undefined })

    await expect(service.create(withAddressId, 'user-1')).rejects.toThrow(/Address not found/)
  })

  /**
   * The delivery address is copied onto the order, never referenced.
   *
   * `orders.addressId` used to be the only record of where a parcel went, so a
   * customer editing their saved address after moving house silently rewrote
   * the destination on every order they had ever placed — including delivered
   * ones, where that record is the only evidence in a dispute.
   *
   * These tests assert the copy happens at write time. Nothing here can be
   * satisfied by a join, which is the point.
   */
  describe('delivery address snapshot', () => {
    const savedAddress = {
      id: 'addr-1',
      label: 'Home',
      fullName: 'Muhammad Ali',
      phone: '+923001234567',
      email: 'ali@example.com',
      addressLine1: 'House 42, Street 5',
      addressLine2: 'Near the masjid',
      area: 'DHA Phase 5',
      city: 'Lahore',
      province: 'Punjab',
      country: 'Pakistan',
      postalCode: '54000',
    }

    /**
     * Run `create` far enough to capture what it would have written, then stop.
     *
     * The variant lookup is the first thing after the address is resolved, so
     * failing it there proves the snapshot was built without needing the whole
     * transaction stubbed out.
     */
    async function captureAddressWrite(
      overrides: Partial<CreateOrderDto>,
      userId?: string,
    ) {
      prisma.productVariant.findUnique.mockResolvedValue(null)
      await expect(service.create(dto(overrides), userId)).rejects.toThrow(
        /Variant v-1 not found/,
      )
    }

    it('copies a chosen saved address onto the order rather than linking it', async () => {
      prisma.address.findFirst.mockResolvedValue(savedAddress)

      // Reaching the variant lookup means resolveAddress returned; what it
      // selected is what proves the snapshot is available to the create.
      await captureAddressWrite({ addressId: 'addr-1', address: undefined }, 'user-1')

      const select = prisma.address.findFirst.mock.calls[0][0].select
      // Every field the order freezes must be selected here. Selecting only
      // `id` — which is what this call used to do — is precisely how the
      // snapshot would silently become a link again.
      for (const field of [
        'label', 'fullName', 'phone', 'email', 'addressLine1', 'addressLine2',
        'area', 'country', 'city', 'province', 'postalCode',
      ]) {
        expect(select).toHaveProperty(field, true)
      }
    })

    it('scopes a saved address to its owner', async () => {
      prisma.address.findFirst.mockResolvedValue(savedAddress)
      await captureAddressWrite({ addressId: 'addr-1', address: undefined }, 'user-1')

      // A guessed id from another account must read as "not found" rather than
      // become a parcel sent to a stranger's door.
      expect(prisma.address.findFirst.mock.calls[0][0].where).toMatchObject({
        id: 'addr-1',
        userId: 'user-1',
      })
    })

    it('leaves an inline checkout address out of the address book by default', async () => {
      prisma.address.create.mockResolvedValue({ ...savedAddress, id: 'addr-new' })

      await captureAddressWrite({ guestPhone: '+923001234567' }, 'user-1')

      // userId null means the row is order-scoped and invisible to
      // /users/me/addresses. Every signed-in checkout used to write an *owned*
      // row, so a customer ordering monthly accumulated twelve near-duplicates
      // of their home address.
      expect(prisma.address.create.mock.calls[0][0].data).toMatchObject({
        userId: null,
        isDefaultShipping: false,
      })
    })

    it('saves the address to the account when the customer asks it to', async () => {
      prisma.address.create.mockResolvedValue({ ...savedAddress, id: 'addr-new' })

      await captureAddressWrite({ saveAddress: true }, 'user-1')

      expect(prisma.address.create.mock.calls[0][0].data).toMatchObject({
        userId: 'user-1',
      })
    })

    it('ignores saveAddress for a guest, who has no account to save to', async () => {
      prisma.address.create.mockResolvedValue({ ...savedAddress, id: 'addr-new' })

      await captureAddressWrite(
        { saveAddress: true, setDefaultAddress: true, guestPhone: '+923001234567' },
        undefined,
      )

      const data = prisma.address.create.mock.calls[0][0].data
      expect(data.userId).toBeUndefined()
      // A guest address becoming somebody's default would be nonsense — there
      // is no somebody.
      expect(data.isDefaultShipping).toBe(false)
      expect(prisma.address.updateMany).not.toHaveBeenCalled()
    })

    it('demotes the previous default only when saving a new default', async () => {
      prisma.address.create.mockResolvedValue({ ...savedAddress, id: 'addr-new' })

      await captureAddressWrite({ saveAddress: true, setDefaultAddress: true }, 'user-1')

      // Shipping only. Checkout collects a delivery address, so claiming the
      // billing default here would change a setting the customer never saw.
      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isDefaultShipping: false },
      })
    })

    /**
     * Drive `create()` all the way through the transaction and read back what
     * would have been written to the `orders` row.
     *
     * Every other test in this block stops at the variant lookup, which proves
     * the address was *resolved* but not that it was *written*. The whole
     * point of this change is the ten `shipping*` columns landing on the order
     * — a typo like `shippingPostcode` in `toShippingSnapshot` would sail past
     * every assertion above and ship green.
     */
    async function captureOrderRow(
      overrides: Partial<CreateOrderDto>,
      userId?: string,
    ): Promise<Record<string, unknown>> {
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'v-1',
        productId: 'p-1',
        sku: 'IHR-STD-M',
        tier: 'standard',
        size: 'M',
        color: null,
        scent: null,
        price: 100000,
        stock: 10,
        product: { nameEn: 'Ihram Set', images: [{ url: 'https://cdn/ihram.webp' }] },
      })
      // No order issued this year yet, so the number allocator starts at 1001.
      prisma.order.findFirst.mockResolvedValue(null)

      const tx = {
        order: { create: jest.fn(async (args: any) => ({ id: 'o-1', ...args.data })) },
        productVariant: { update: jest.fn() },
        product: { update: jest.fn() },
        coupon: { update: jest.fn() },
      }
      prisma.$transaction.mockImplementation((work: any) => work(tx))

      await service.create(dto(overrides), userId)

      return tx.order.create.mock.calls[0][0].data
    }

    it('writes all eleven address columns onto the order row', async () => {
      prisma.address.findFirst.mockResolvedValue(savedAddress)

      const row = await captureOrderRow({ addressId: 'addr-1', address: undefined }, 'user-1')

      // Field names are asserted literally, because they are the contract
      // between this service, schema.prisma, the backfill migration and both
      // frontends. A rename that misses one of those five places is exactly
      // the bug this pins.
      expect(row).toMatchObject({
        shippingLabel: 'Home',
        shippingFullName: 'Muhammad Ali',
        shippingPhone: '+923001234567',
        shippingEmail: 'ali@example.com',
        shippingAddressLine1: 'House 42, Street 5',
        shippingAddressLine2: 'Near the masjid',
        shippingArea: 'DHA Phase 5',
        shippingCountry: 'Pakistan',
        shippingCity: 'Lahore',
        shippingProvince: 'Punjab',
        shippingPostalCode: '54000',
      })
    })

    it('keeps addressId alongside the snapshot, for provenance', async () => {
      prisma.address.findFirst.mockResolvedValue(savedAddress)

      const row = await captureOrderRow({ addressId: 'addr-1', address: undefined }, 'user-1')

      // The link still records *which* saved address was chosen. What changed
      // is that nothing reads through it for display.
      expect(row.addressId).toBe('addr-1')
    })

    it('snapshots an inline address too, not just a saved one', async () => {
      prisma.address.create.mockResolvedValue({ ...savedAddress, id: 'addr-new' })

      const row = await captureOrderRow({ guestPhone: '+923001234567' }, undefined)

      // A guest order has the same claim on an immutable record of where its
      // parcel went as an account order does.
      expect(row.shippingFullName).toBe('Muhammad Ali')
      expect(row.shippingCity).toBe('Lahore')
    })

    it('does not demote anything when the address is not being saved', async () => {
      prisma.address.create.mockResolvedValue({ ...savedAddress, id: 'addr-new' })

      // setDefaultAddress without saveAddress is meaningless: an order-scoped
      // row is not in the address book to be defaulted to. It must not clear
      // the customer's real default as a side effect.
      await captureAddressWrite({ setDefaultAddress: true }, 'user-1')

      expect(prisma.address.updateMany).not.toHaveBeenCalled()
    })
  })

  describe('shop configuration', () => {
    it('blocks guest orders when guest checkout is switched off', async () => {
      // The admin toggle has to actually stop guest orders, not just hide the
      // option in checkout — otherwise the switch is decorative.
      settings.getBoolean.mockImplementation(async (key, fallback) =>
        key === 'guest_checkout_enabled' ? false : fallback,
      )

      await expect(
        service.create(dto({ guestPhone: '+923001234567' }), undefined),
      ).rejects.toThrow(/sign in or create an account/)
    })

    it('still allows signed-in orders when guest checkout is off', async () => {
      settings.getBoolean.mockImplementation(async (key, fallback) =>
        key === 'guest_checkout_enabled' ? false : fallback,
      )
      prisma.address.create.mockResolvedValue({ id: 'addr-1' })
      prisma.productVariant.findUnique.mockResolvedValue(null)

      await expect(service.create(dto(), 'user-1')).rejects.toThrow(/Variant v-1 not found/)
    })

    it('blocks cash on delivery when it is switched off', async () => {
      settings.getBoolean.mockImplementation(async (key, fallback) =>
        key === 'cod_enabled' ? false : fallback,
      )

      await expect(
        service.create(dto({ paymentMethod: 'cod', guestPhone: '+923001234567' }), undefined),
      ).rejects.toThrow(/not available at the moment/)
    })

    it('rejects an order below the configured minimum', async () => {
      settings.getNumber.mockImplementation(async (key, fallback) =>
        key === 'min_order_amount' ? 500000 : fallback,
      )
      prisma.address.create.mockResolvedValue({ id: 'addr-1' })
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'v-1',
        productId: 'p-1',
        sku: 'SKU-1',
        tier: 'Standard',
        price: 100000, // ₨1,000 — under the ₨5,000 minimum
        stock: 10,
        product: { nameEn: 'Attar', images: [] },
      })

      await expect(
        service.create(dto({ guestPhone: '+923001234567' }), undefined),
      ).rejects.toThrow(/at least ₨5,000/)
    })

    it('does not enforce a minimum when it is zero', async () => {
      // 0 is the seeded default and means "no minimum" — it must not reject
      // every order by comparing against itself.
      prisma.address.create.mockResolvedValue({ id: 'addr-1' })
      prisma.productVariant.findUnique.mockResolvedValue(null)

      await expect(
        service.create(dto({ guestPhone: '+923001234567' }), undefined),
      ).rejects.toThrow(/Variant v-1 not found/)
    })
  })
})

/**
 * Public tracking accepts the order number and nothing else, so these tests
 * guard the two properties that make that safe: the number is unguessable,
 * and the response carries nothing that identifies the customer.
 */
describe('OrdersService.trackByNumber', () => {
  let service: OrdersService

  const prisma = {
    order: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    address: { findFirst: jest.fn(), create: jest.fn() },
    productVariant: { findUnique: jest.fn() },
    coupon: { findFirst: jest.fn() },
    setting: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  }

  const settings = {
    getNumber: jest.fn(async (_k: string, f: number) => f),
    getBoolean: jest.fn(async (_k: string, f: boolean) => f),
    getString: jest.fn(async (_k: string, f: string) => f),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: settings },
      ],
    }).compile()
    service = moduleRef.get(OrdersService)
  })

  const storedOrder = {
    number: 'YH-2026-1001-K7QX9M',
    status: 'shipped',
    shippingMethod: 'standard',
    trackingNumber: 'TCS-123',
    total: 250000,
    createdAt: new Date('2026-08-01'),
    items: [{ name: 'Ihram Set', image: null, quantity: 1, tier: 'standard', size: null, color: null }],
    timeline: [{ status: 'shipped', note: null, createdAt: new Date('2026-08-02') }],
    // Fields the row carries but the caller must never receive.
    guestEmail: 'buyer@example.com',
    guestPhone: '+923001234567',
    address: { fullName: 'Muhammad Ali', addressLine1: 'House 42' },
    user: { email: 'buyer@example.com', phone: '+923001234567' },
    couponId: 'coupon-1',
    paymentMethod: 'cod',
    // The delivery-address snapshot. These eleven columns put the recipient's
    // name, phone, email and street address on the order row itself, so the
    // public tracking response has ten new ways to leak that it did not have
    // before — and the guard above only checks what is listed here.
    shippingLabel: 'Home',
    shippingFullName: 'Muhammad Ali',
    shippingPhone: '+923001234567',
    shippingEmail: 'buyer@example.com',
    shippingAddressLine1: 'House 42, Street 5',
    shippingAddressLine2: 'Near the masjid',
    shippingArea: 'DHA Phase 5',
    shippingCountry: 'Pakistan',
    shippingCity: 'Lahore',
    shippingProvince: 'Punjab',
    shippingPostalCode: '54000',
  }

  it('returns nothing that identifies the customer', async () => {
    // The number travels in WhatsApp messages and screenshots. Someone who
    // ends up holding one should learn where the parcel is, not where the
    // customer lives or how to contact them.
    prisma.order.findFirst.mockResolvedValue(storedOrder)

    const result = await service.trackByNumber('YH-2026-1001-K7QX9M')

    for (const leaked of [
      'guestEmail', 'guestPhone', 'address', 'user', 'couponId', 'paymentMethod',
      'shippingLabel', 'shippingFullName', 'shippingPhone', 'shippingEmail',
      'shippingAddressLine1', 'shippingAddressLine2', 'shippingArea',
      'shippingCountry', 'shippingCity', 'shippingProvince', 'shippingPostalCode',
    ]) {
      expect(result).not.toHaveProperty(leaked)
    }
    expect(result.number).toBe('YH-2026-1001-K7QX9M')
    expect(result.status).toBe('shipped')
  })

  it('reports a miss as 404 rather than confirming the order exists', async () => {
    prisma.order.findFirst.mockResolvedValue(null)
    await expect(service.trackByNumber('YH-2026-9999-ZZZZZZ')).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('matches case-insensitively so a number typed in lower case still works', async () => {
    prisma.order.findFirst.mockResolvedValue(storedOrder)

    await service.trackByNumber('  yh-2026-1001-k7qx9m  ')

    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { number: 'YH-2026-1001-K7QX9M' } }),
    )
  })
})

describe('TrackOrderDto — order number format', () => {
  /**
   * The token is the entire credential for public tracking. If this DTO ever
   * accepts a bare sequential number again, `YH-2026-1001`, `1002`, … walks
   * the order table — which is exactly what the token was introduced to stop.
   */
  async function errorsFor(number: unknown) {
    const { validate } = await import('class-validator')
    const { plainToInstance } = await import('class-transformer')
    const { TrackOrderDto } = await import('./dto/track-order.dto')
    return validate(plainToInstance(TrackOrderDto, { number }))
  }

  it('rejects a bare sequential number with no token', async () => {
    expect(await errorsFor('YH-2026-1001')).toHaveLength(1)
  })

  it('accepts a full tokenised number, in any case, with surrounding space', async () => {
    expect(await errorsFor('YH-2026-1001-K7QX9M')).toHaveLength(0)
    expect(await errorsFor('  yh-2026-1001-k7qx9m  ')).toHaveLength(0)
  })

  it('rejects tokens containing the excluded Base32 letters', async () => {
    // I, L, O and U are not in the alphabet, so a number containing one is a
    // misreading of 1 or 0 rather than a real order. Failing here gives the
    // customer the format hint instead of a bare "not found".
    for (const bad of ['YH-2026-1001-K7QXIM', 'YH-2026-1001-K7QXOM', 'YH-2026-1001-K7QXLU']) {
      expect(await errorsFor(bad)).toHaveLength(1)
    }
  })

  it('rejects a token of the wrong length', async () => {
    expect(await errorsFor('YH-2026-1001-K7QX9')).toHaveLength(1)
    expect(await errorsFor('YH-2026-1001-K7QX9MM')).toHaveLength(1)
  })
})

/**
 * Status transitions are enforced server-side, not only narrowed in the admin
 * dropdown. These lock the flow so a future edit cannot quietly allow a jump
 * the operations process does not permit (e.g. pending → delivered) or reopen
 * a terminal order.
 */
describe('order status transitions', () => {
  it('allows each step of the forward flow', () => {
    expect(canTransitionOrder('pending', 'confirmed')).toBe(true)
    expect(canTransitionOrder('confirmed', 'processing')).toBe(true)
    expect(canTransitionOrder('processing', 'packed')).toBe(true)
    expect(canTransitionOrder('packed', 'shipped')).toBe(true)
    expect(canTransitionOrder('shipped', 'out_for_delivery')).toBe(true)
    expect(canTransitionOrder('out_for_delivery', 'delivered')).toBe(true)
    expect(canTransitionOrder('delivered', 'refunded')).toBe(true)
  })

  it('allows cancelling only before dispatch', () => {
    expect(canTransitionOrder('pending', 'cancelled')).toBe(true)
    expect(canTransitionOrder('packed', 'cancelled')).toBe(true)
    expect(canTransitionOrder('shipped', 'cancelled')).toBe(false)
  })

  it('rejects skips and reopening terminal states', () => {
    expect(canTransitionOrder('pending', 'delivered')).toBe(false)
    expect(canTransitionOrder('cancelled', 'confirmed')).toBe(false)
    expect(canTransitionOrder('refunded', 'delivered')).toBe(false)
    // Same-status is not a legal move — it would only add an empty timeline row.
    expect(canTransitionOrder('pending', 'pending')).toBe(false)
  })
})

/**
 * Payment-status transitions are enforced server-side, same reasoning as
 * order-status transitions: the admin dropdown already narrows the options,
 * but a hand-rolled request must not be able to refund money that was never
 * collected, or refund the same order twice.
 */
describe('payment status transitions', () => {
  it('allows collection and refund of a paid order', () => {
    expect(canTransitionPaymentStatus('unpaid', 'paid')).toBe(true)
    expect(canTransitionPaymentStatus('paid', 'refunded')).toBe(true)
    expect(canTransitionPaymentStatus('paid', 'partially_refunded')).toBe(true)
    expect(canTransitionPaymentStatus('partially_refunded', 'refunded')).toBe(true)
  })

  it('never allows refunding an order that was never paid', () => {
    expect(canTransitionPaymentStatus('unpaid', 'refunded')).toBe(false)
    expect(canTransitionPaymentStatus('unpaid', 'partially_refunded')).toBe(false)
  })

  it('treats refunded as terminal — the same order cannot be refunded twice', () => {
    expect(canTransitionPaymentStatus('refunded', 'paid')).toBe(false)
    expect(canTransitionPaymentStatus('refunded', 'refunded')).toBe(false)
  })
})

/**
 * `setPaymentStatus` and `setTracking` guards. Asserted against a Prisma
 * double so a regression here fails a unit test rather than surfacing as a
 * cancelled, unpaid order that can still be "refunded" or handed to a courier.
 */
describe('OrdersService — cancelled-order payment and courier guards', () => {
  let service: OrdersService

  const tx = {
    order: { updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    orderTimeline: { create: jest.fn() },
  }

  const prisma = {
    order: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((work: any) => (typeof work === 'function' ? work(tx) : Promise.all(work))),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    prisma.$transaction.mockImplementation((work: any) =>
      typeof work === 'function' ? work(tx) : Promise.all(work),
    )

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: {} },
      ],
    }).compile()

    service = moduleRef.get(OrdersService)
  })

  it('refuses any payment-status change on a cancelled, unpaid order', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o-1', status: 'cancelled', paymentStatus: 'unpaid' })

    await expect(service.setPaymentStatus('o-1', 'paid')).rejects.toBeInstanceOf(BadRequestException)
    expect(tx.order.updateMany).not.toHaveBeenCalled()
  })

  it('refuses to refund an unpaid order even when not cancelled', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o-1', status: 'pending', paymentStatus: 'unpaid' })

    await expect(service.setPaymentStatus('o-1', 'refunded')).rejects.toBeInstanceOf(BadRequestException)
    expect(tx.order.updateMany).not.toHaveBeenCalled()
  })

  it('keeps refund available on a cancelled order that was paid', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o-1', status: 'cancelled', paymentStatus: 'paid' })
    tx.order.updateMany.mockResolvedValue({ count: 1 })
    tx.order.findUniqueOrThrow.mockResolvedValue({ id: 'o-1', paymentStatus: 'refunded' })

    await service.setPaymentStatus('o-1', 'refunded')

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o-1', paymentStatus: 'paid' },
      data: { paymentStatus: 'refunded' },
    })
  })

  it('rejects a concurrent double-refund via the conditional update', async () => {
    // The read saw `paid`, but another request refunded it first — the
    // conditional updateMany matches zero rows, and this must surface as an
    // error rather than silently doing nothing (which would look like success).
    prisma.order.findUnique.mockResolvedValue({ id: 'o-1', status: 'delivered', paymentStatus: 'paid' })
    tx.order.updateMany.mockResolvedValue({ count: 0 })

    await expect(service.setPaymentStatus('o-1', 'refunded')).rejects.toBeInstanceOf(BadRequestException)
    expect(tx.orderTimeline.create).not.toHaveBeenCalled()
  })

  it('refuses a courier tracking number on a cancelled, unpaid order', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o-1', status: 'cancelled', paymentStatus: 'unpaid' })

    await expect(service.setTracking('o-1', 'TCS-123')).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.order.update).not.toHaveBeenCalled()
  })

  it('allows a courier tracking number on a cancelled order that was paid', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o-1', status: 'cancelled', paymentStatus: 'paid' })
    prisma.order.update.mockResolvedValue({ id: 'o-1', trackingNumber: 'TCS-123' })

    await service.setTracking('o-1', 'TCS-123')

    expect(prisma.order.update).toHaveBeenCalled()
  })
})

describe('CreateOrderDto — payment method', () => {
  it('accepts only the methods that can actually take money', async () => {
    // Guards against a gateway-backed method being re-enabled in the enum
    // without a gateway behind it. Such an order looks paid to the customer
    // and unpaid to fulfilment.
    const { validate } = await import('class-validator')
    const { plainToInstance } = await import('class-transformer')

    async function paymentErrorsFor(paymentMethod: string) {
      const instance = plainToInstance(CreateOrderDto, {
        items: [{ variantId: 'v-1', quantity: 1 }],
        paymentMethod,
        guestPhone: '+923001234567',
        address: {
          fullName: 'Muhammad Ali',
          phone: '+923001234567',
          addressLine1: 'House 42, Street 5',
          city: 'Lahore',
          province: 'Punjab',
        },
      })
      const errors = await validate(instance)
      return errors.filter((e) => e.property === 'paymentMethod')
    }

    expect(await paymentErrorsFor('cod')).toHaveLength(0)

    // `bank_transfer` is not supported by the business, and the other three
    // have no gateway behind them. All four are rejected at the DTO, so
    // re-listing one in the UI without wiring it up fails here first.
    for (const disabled of ['bank_transfer', 'jazzcash', 'easypaisa', 'card']) {
      expect(await paymentErrorsFor(disabled)).toHaveLength(1)
    }
  })
})
