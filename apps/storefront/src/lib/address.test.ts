import { describe, it, expect } from 'vitest'
import {
  formatAddressLines,
  formatAddressInline,
  isDeliverable,
  DEFAULT_COUNTRY,
} from './address'
import type { Address } from '@/types'

const full: Address = {
  id: 'a-1',
  label: 'Home',
  fullName: 'Muhammad Ali',
  phone: '+923001234567',
  addressLine1: 'House 42, Street 5',
  addressLine2: 'Near the masjid',
  area: 'DHA Phase 5',
  city: 'Lahore',
  province: 'Punjab',
  country: DEFAULT_COUNTRY,
  postalCode: '54000',
  labelType: 'home',
  isDefaultShipping: true,
  isDefaultBilling: false,
}

describe('formatAddressLines', () => {
  it('groups street, locality and region into three lines', () => {
    expect(formatAddressLines(full)).toEqual([
      'House 42, Street 5, Near the masjid',
      'DHA Phase 5, Lahore',
      'Punjab 54000',
    ])
  })

  it('drops blank parts rather than rendering empty lines or stray commas', () => {
    // The bug this prevents: an address with no area and no postcode rendered
    // as four lines, two of them a lone comma, on the order detail page.
    expect(
      formatAddressLines({
        addressLine1: 'House 42',
        city: 'Karachi',
        province: 'Sindh',
      }),
    ).toEqual(['House 42', 'Karachi', 'Sindh'])
  })

  it('treats whitespace-only fields as absent', () => {
    expect(
      formatAddressLines({ addressLine1: 'House 42', addressLine2: '   ', city: 'Quetta' }),
    ).toEqual(['House 42', 'Quetta'])
  })

  it('includes area, which several screens used to drop silently', () => {
    // Area appearing on one screen and not the next reads to a customer as
    // data that has been lost.
    expect(formatAddressInline(full)).toContain('DHA Phase 5')
  })

  it('hides the country when it is the one every address has', () => {
    // A line reading "Pakistan" under every address on a Pakistan-only shop is
    // noise on a phone-sized card.
    expect(formatAddressInline(full)).not.toContain(DEFAULT_COUNTRY)
  })

  it('shows the country as soon as it is not the default', () => {
    // The day the shop ships abroad this starts appearing exactly where it
    // matters, with no code change.
    expect(formatAddressLines({ ...full, country: 'Saudi Arabia' })).toContain(
      'Saudi Arabia',
    )
  })
})

describe('isDeliverable', () => {
  it('accepts an address a courier could actually find', () => {
    expect(isDeliverable(full)).toBe(true)
  })

  it('rejects an address saved before phone was required', () => {
    // Checkout prefills from a saved address and lets the customer continue
    // without opening the form, so a row like this would otherwise fail at the
    // API on the review step — after they had chosen a payment method.
    expect(isDeliverable({ ...full, phone: '' })).toBe(false)
  })

  it('rejects a name of spaces, which satisfies a required attribute', () => {
    expect(isDeliverable({ ...full, fullName: '   ' })).toBe(false)
  })

  it('rejects undefined rather than throwing', () => {
    expect(isDeliverable(undefined)).toBe(false)
  })
})
