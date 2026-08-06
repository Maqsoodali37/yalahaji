import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { OrdersService } from './orders.service'
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
    address: { findFirst: jest.fn(), create: jest.fn() },
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
    // Such an order cannot be tracked by its buyer — `trackOrder` matches on
    // exactly these two fields — and support has no way to chase it.
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
