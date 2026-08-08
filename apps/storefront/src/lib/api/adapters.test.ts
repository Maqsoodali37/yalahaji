import { describe, it, expect } from 'vitest'
import { adaptProduct, adaptSettings, adaptOrder } from './adapters'
import { SETTINGS_FALLBACK } from './catalog'
import type { WireProduct, WireProductMedia, WireOrder } from './wire'

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

describe('adaptProduct — per-locale SEO', () => {
  function withSeo(seo: Partial<WireProduct>): WireProduct {
    return { ...wireProduct([]), ...seo }
  }

  it('uses the locale\'s own SEO title when one is written', () => {
    const p = withSeo({ seoTitleEn: 'Ihram Set | YalaHaji', seoTitleUr: 'احرام سیٹ | یالا حاجی' })

    expect(adaptProduct(p).seoTitle?.ur).toBe('احرام سیٹ | یالا حاجی')
  })

  it('falls back to English when a locale has no SEO title', () => {
    // Better to index an Urdu page under an English title than under nothing.
    const p = withSeo({ seoTitleEn: 'Ihram Set | YalaHaji', seoTitleAr: null })

    expect(adaptProduct(p).seoTitle?.ar).toBe('Ihram Set | YalaHaji')
  })

  it('leaves every locale undefined when nothing is written', () => {
    // This is the distinction `localised` cannot express. If a missing SEO
    // title arrived as '' instead, `seoTitle[locale] ?? name` in
    // generateMetadata would take the empty string and ship a blank <title>.
    const seo = adaptProduct(withSeo({})).seoTitle

    expect(seo).toEqual({ en: undefined, ur: undefined, ar: undefined })
  })

  it('treats a whitespace-only value as nothing written', () => {
    // Staff clearing a box can leave a stray space behind; that must not count
    // as a deliberately blank title.
    const p = withSeo({ seoDescEn: 'Real copy.', seoDescUr: '   ' })

    expect(adaptProduct(p).seoDescription?.ur).toBe('Real copy.')
  })

  it('carries keywords through per locale', () => {
    const p = withSeo({ seoKeywordsEn: 'ihram, hajj', seoKeywordsAr: 'إحرام, حج' })

    expect(adaptProduct(p).seoKeywords?.ar).toBe('إحرام, حج')
    expect(adaptProduct(p).seoKeywords?.ur).toBe('ihram, hajj')
  })
})

describe('adaptOrder — delivery address', () => {
  /**
   * The saved address the order was placed against, as it looks *today* —
   * after the customer moved house and edited it.
   */
  const editedSavedAddress = {
    id: 'addr-1',
    label: 'Home',
    fullName: 'Muhammad Ali',
    phone: '+923009999999',
    email: null,
    addressLine1: 'Flat 9, New Block',
    addressLine2: null,
    area: null,
    city: 'Islamabad',
    province: 'Punjab',
    country: 'Pakistan',
    postalCode: null,
    labelType: 'home' as const,
    isDefaultShipping: true,
    isDefaultBilling: false,
  }

  function order(overrides: Partial<WireOrder> = {}): WireOrder {
    return {
      id: 'o-1',
      number: 'YH-2026-1001-K7QX9M',
      status: 'delivered',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      shippingMethod: 'standard',
      subtotal: 100000,
      shippingCost: 0,
      discount: 0,
      tax: 0,
      total: 100000,
      trackingNumber: null,
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      items: [],
      timeline: [],
      shippingLabel: 'Home',
      shippingFullName: 'Muhammad Ali',
      shippingPhone: '+923001234567',
      shippingEmail: null,
      shippingAddressLine1: 'House 42, Street 5',
      shippingAddressLine2: null,
      shippingArea: 'DHA Phase 5',
      shippingCountry: 'Pakistan',
      shippingCity: 'Lahore',
      shippingProvince: 'Punjab',
      shippingPostalCode: '54000',
      address: editedSavedAddress,
      ...overrides,
    } as WireOrder
  }

  it('renders the snapshot, not the saved address it was copied from', () => {
    // This is the whole point of the snapshot. Reading `address` here meant a
    // customer moving house rewrote the delivery address on every order they
    // had ever placed — including this delivered one, whose recorded
    // destination is the only evidence of where the goods actually went.
    const adapted = adaptOrder(order())

    expect(adapted.shippingAddress.city).toBe('Lahore')
    expect(adapted.shippingAddress.phone).toBe('+923001234567')
    expect(adapted.shippingAddress.area).toBe('DHA Phase 5')
    // Not Islamabad, which is where they live now.
    expect(adapted.shippingAddress.city).not.toBe(editedSavedAddress.city)
  })

  it('never marks a snapshot as a default address', () => {
    // An order address is a historical record, not a preference — a "Default"
    // badge against a snapshot the customer has since replaced is a lie.
    expect(adaptOrder(order()).shippingAddress.isDefaultShipping).toBe(false)
    expect(adaptOrder(order()).shippingAddress.isDefaultBilling).toBe(false)
  })

  it('falls back to the linked address only when there is no snapshot', () => {
    // Covers a rolling deploy: the migration has run but an old API instance
    // is still serving orders without the shipping* columns.
    const adapted = adaptOrder(order({ shippingFullName: null }))

    expect(adapted.shippingAddress.city).toBe('Islamabad')
    // Even the fallback must not inherit the saved row's default flag — that
    // row is a live preference, this is a historical record.
    expect(adapted.shippingAddress.isDefaultShipping).toBe(false)
  })

  it('gives components an empty address rather than null for a bare order', () => {
    // Components read fields off `shippingAddress` unconditionally; null here
    // is a crash on the server render, which the browser reports as a
    // client-side exception rather than anything diagnosable.
    const adapted = adaptOrder(order({ shippingFullName: null, address: null }))

    expect(adapted.shippingAddress.fullName).toBe('')
    expect(adapted.shippingAddress.city).toBe('')
  })

  it('defaults a missing paymentStatus to unpaid', () => {
    // "Unpaid" is the safe reading of a COD order nobody has confirmed
    // collection on; `undefined` renders as a blank badge.
    const adapted = adaptOrder(order({ paymentStatus: undefined as never }))
    expect(adapted.paymentStatus).toBe('unpaid')
  })
})
