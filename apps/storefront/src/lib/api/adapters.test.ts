import { describe, it, expect } from 'vitest'
import { adaptSettings } from './adapters'
import { SETTINGS_FALLBACK } from './catalog'

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
