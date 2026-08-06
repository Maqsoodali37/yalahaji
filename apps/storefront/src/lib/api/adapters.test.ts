import { describe, it, expect } from 'vitest'
import { adaptProduct, adaptSettings } from './adapters'
import { SETTINGS_FALLBACK } from './catalog'
import type { WireProduct, WireProductMedia } from './wire'

describe('adaptSettings', () => {
  it('converts money from paisas to rupees', () => {
    // The API stores paisas throughout; a component that divided by 100 itself
    // is a component that would one day forget.
    const s = adaptSettings({
      free_shipping_threshold: 299900,
      standard_shipping_cost: 29900,
      cod_fee: 15000,
      min_order_amount: 50000,
    })

    expect(s.freeShippingThreshold).toBe(2999)
    expect(s.standardShippingCost).toBe(299)
    expect(s.codFee).toBe(150)
    expect(s.minOrderAmount).toBe(500)
  })

  it('leaves tax_percentage alone — it is a percentage, not money', () => {
    expect(adaptSettings({ tax_percentage: 17 }).taxPercentage).toBe(17)
  })

  it('falls back for every key when the payload is empty', () => {
    // A brand new shop may have published nothing yet.
    expect(adaptSettings({})).toEqual(SETTINGS_FALLBACK)
  })

  /**
   * The storefront's fallbacks must match the values seeded in
   * `apps/api/src/settings/config-catalogue.ts`.
   *
   * This is the test for the bug that started all of this: the storefront
   * carried its own `FREE_SHIPPING_THRESHOLD = 5000` while the API seeded
   * `free_shipping_threshold = 299900` paisas. The shipping policy page
   * promised free delivery over ₨5,000 and checkout applied it at ₨2,999.
   *
   * Written out as literals on purpose. Deriving them from the same source the
   * implementation uses would assert nothing — the point is that a change on
   * either side has to be made deliberately on both.
   */
  it('mirrors the seeded config-catalogue values', () => {
    expect(SETTINGS_FALLBACK.freeShippingThreshold).toBe(2999) // 299900 paisas
    expect(SETTINGS_FALLBACK.standardShippingCost).toBe(299) // 29900 paisas
    expect(SETTINGS_FALLBACK.expressShippingCost).toBe(499) // 49900 paisas
    expect(SETTINGS_FALLBACK.giftWrapPrice).toBe(99) // 9900 paisas
    expect(SETTINGS_FALLBACK.codFee).toBe(0)
    expect(SETTINGS_FALLBACK.minOrderAmount).toBe(0)
    expect(SETTINGS_FALLBACK.taxPercentage).toBe(0)
    expect(SETTINGS_FALLBACK.currencySymbol).toBe('₨')
  })

  it('prefers a published value over the fallback', () => {
    // The whole point of centralising: an admin raising the threshold has to
    // reach the storefront without a code change.
    expect(adaptSettings({ free_shipping_threshold: 500000 }).freeShippingThreshold).toBe(5000)
  })

  it('ignores a corrupt value instead of propagating NaN', () => {
    const s = adaptSettings({
      free_shipping_threshold: 'not a number' as unknown as number,
      currency_symbol: '',
    })

    expect(s.freeShippingThreshold).toBe(SETTINGS_FALLBACK.freeShippingThreshold)
    // An empty symbol would render prices as bare numbers.
    expect(s.currencySymbol).toBe('₨')
  })

  it('reads booleans sent as strings as well as real booleans', () => {
    expect(adaptSettings({ coupon_enabled: false }).couponEnabled).toBe(false)
    expect(adaptSettings({ coupon_enabled: 'false' }).couponEnabled).toBe(false)
    expect(adaptSettings({ coupon_enabled: 'true' }).couponEnabled).toBe(true)
    expect(adaptSettings({ coupon_enabled: '1' }).couponEnabled).toBe(true)
  })

  it('keeps unknown keys from breaking the shape', () => {
    // Requirement of the key/value design: staff can publish a new config at
    // any time, and the storefront must not care until it is taught to.
    const s = adaptSettings({ something_new: 'hello', store_name: 'Yala Haji' })

    expect(s.storeName).toBe('Yala Haji')
    expect(s.currencySymbol).toBe('₨')
  })

  it('defaults payment flags closed and display flags open', () => {
    const s = adaptSettings({})

    // Failing open on payment would imply we can take money we cannot.
    expect(s.onlinePaymentEnabled).toBe(false)
    expect(s.walletPaymentEnabled).toBe(false)
    // Failing closed on these would break a working shop.
    expect(s.codEnabled).toBe(true)
    expect(s.guestCheckoutEnabled).toBe(true)
    expect(s.couponEnabled).toBe(true)
  })
})

// ─── Product images ───────────────────────────────────────────────────────────

function media(
  id: string,
  order: number,
  isPrimary: boolean,
  alt: string | null = null,
): WireProductMedia {
  return { id, url: `https://cdn.example/${id}.webp`, alt, isPrimary, order }
}

function wireProduct(images: WireProductMedia[]): WireProduct {
  return {
    id: 'p1',
    slug: 'ihram-set',
    sku: 'YH-IHR-001',
    nameEn: 'Ihram Set',
    nameUr: 'احرام سیٹ',
    nameAr: 'إحرام',
    descEn: 'd',
    descUr: 'd',
    descAr: 'd',
    shortDescEn: 's',
    shortDescUr: 's',
    shortDescAr: 's',
    isKit: false,
    hasGiftWrap: false,
    hasPreOrder: false,
    avgRating: 0,
    reviewCount: 0,
    soldCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    category: { id: 'c1', slug: 'ihram', nameEn: 'Ihram' },
    variants: [],
    images,
    badges: [],
    tags: [],
  }
}

describe('adaptProduct — images', () => {
  it('puts the primary image first even when the API sorted it last', () => {
    // The product card, compare bar, kit builder and cart all read images[0].
    // Before this, ticking "primary" in the admin panel changed nothing the
    // customer could see unless that photo happened to also be first by order.
    const product = adaptProduct(
      wireProduct([
        media('back', 0, false),
        media('side', 1, false),
        media('front', 2, true),
      ]),
    )

    expect(product.images[0].id).toBe('front')
  })

  it('keeps the remaining images in the order staff arranged', () => {
    // Reordering the gallery is a merchandising decision; promoting the
    // primary must not shuffle everything else as a side effect.
    const product = adaptProduct(
      wireProduct([
        media('a', 0, false),
        media('b', 1, true),
        media('c', 2, false),
        media('d', 3, false),
      ]),
    )

    expect(product.images.map((i) => i.id)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('leaves the order untouched when no image is flagged primary', () => {
    // Photos predating the flag have `order` as their only signal, so
    // inventing a primary here would silently override a staff decision.
    const product = adaptProduct(
      wireProduct([media('a', 0, false), media('b', 1, false)]),
    )

    expect(product.images.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('falls back to the product name when alt text is blank', () => {
    // An empty alt attribute tells a screen reader nothing. The product name
    // is a worse description than a written one but far better than silence.
    const product = adaptProduct(wireProduct([media('a', 0, true, '')]))

    expect(product.images[0].alt).toBe('Ihram Set')
  })

  it('survives a product with no images at all', () => {
    // Storefront renders the brand mark; it must not throw first.
    expect(adaptProduct(wireProduct([])).images).toEqual([])
  })
})
