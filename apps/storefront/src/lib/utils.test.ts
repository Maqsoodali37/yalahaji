import { describe, it, expect } from 'vitest'
import { getDefaultVariant, getLowestPrice, hasPriceRange } from './utils'
import type { ProductVariant } from '@/types'

/** Only the fields these helpers read. */
function variant(over: Partial<ProductVariant> & { price: number }): ProductVariant {
  return {
    id: `v-${over.price}`,
    sku: `SKU-${over.price}`,
    tier: 'Standard',
    stock: 10,
    lowStockThreshold: 3,
    ...over,
  } as ProductVariant
}

describe('getDefaultVariant', () => {
  it('picks the cheapest variant regardless of the order supplied', () => {
    // The API returned variants unordered, so `variants[0]` was arbitrary —
    // a card advertising ₨1,199 could open its product page at ₨4,999.
    const variants = [variant({ price: 4999 }), variant({ price: 1199 }), variant({ price: 2499 })]

    expect(getDefaultVariant(variants)?.price).toBe(1199)
  })

  it('skips out-of-stock variants so the price shown can be bought', () => {
    const variants = [
      variant({ price: 1199, stock: 0 }),
      variant({ price: 2499, stock: 5 }),
      variant({ price: 4999, stock: 2 }),
    ]

    expect(getDefaultVariant(variants)?.price).toBe(2499)
  })

  it('falls back to the cheapest when everything is out of stock', () => {
    const variants = [variant({ price: 4999, stock: 0 }), variant({ price: 1199, stock: 0 })]

    expect(getDefaultVariant(variants)?.price).toBe(1199)
  })

  it('returns undefined for a product with no variants', () => {
    expect(getDefaultVariant([])).toBeUndefined()
  })

  it('does not mutate the array it is given', () => {
    // It sorts internally; sorting in place would reorder the caller's list
    // and change what the variant picker renders.
    const variants = [variant({ price: 4999 }), variant({ price: 1199 })]
    getDefaultVariant(variants)

    expect(variants.map((v) => v.price)).toEqual([4999, 1199])
  })
})

describe('hasPriceRange', () => {
  it('is true only when variants actually differ in price', () => {
    expect(hasPriceRange([variant({ price: 1199 }), variant({ price: 4999 })])).toBe(true)
    expect(hasPriceRange([variant({ price: 1199 }), variant({ price: 1199 })])).toBe(false)
    expect(hasPriceRange([variant({ price: 1199 })])).toBe(false)
    expect(hasPriceRange([])).toBe(false)
  })
})

describe('getLowestPrice', () => {
  it('agrees with getDefaultVariant when everything is in stock', () => {
    const variants = [variant({ price: 4999 }), variant({ price: 1199 }), variant({ price: 2499 })]

    expect(getLowestPrice(variants)).toBe(getDefaultVariant(variants)!.price)
  })
})
