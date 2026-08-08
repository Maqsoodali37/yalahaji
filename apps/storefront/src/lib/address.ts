import type { Address } from '@/types'

/**
 * The shop ships within Pakistan. Stored rather than asked: every province in
 * `PROVINCES` is Pakistani, so a required country field is one more tap for an
 * answer already known.
 *
 * Mirrors the `country` column default in schema.prisma — change one, change
 * both, or a form submitted without a country lands on a different value than
 * the one the form displayed.
 *
 * Declared here rather than in `lib/validation.ts` because `adapters.ts` needs
 * it too, and validation already imports from `lib/api` — putting it there
 * would close an import cycle through this constant's own initialiser.
 */
export const DEFAULT_COUNTRY = 'Pakistan'

/** Offered in the country picker. One entry today; the list is the seam. */
export const COUNTRIES = [DEFAULT_COUNTRY] as const

/**
 * An address as display lines, in the order a courier reads them.
 *
 * One definition because five surfaces render an address — the address book,
 * checkout's review step, checkout's saved-address picker, the order list and
 * the order detail page — and they had each been assembling their own subset.
 * The visible symptom was `area` and `addressLine2` appearing on some screens
 * and not others, which reads to a customer as data that has been lost.
 *
 * Blank parts are dropped rather than rendered as empty lines or stray commas,
 * so an address with no area and no postcode is two lines, not four.
 */
export function formatAddressLines(address: Partial<Address>): string[] {
  const street = [address.addressLine1, address.addressLine2]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(', ')

  const locality = [address.area, address.city]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(', ')

  const region = [address.province, address.postalCode]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' ')

  // The country is shown only when it is not the one every address has.
  // Printing "Pakistan" under every Pakistani address on a Pakistani shop is
  // a line of noise on a phone-sized card; the moment the shop ships abroad it
  // starts appearing exactly where it matters, with no code change.
  const country = address.country?.trim()
  const foreign = country && country !== DEFAULT_COUNTRY ? country : ''

  return [street, locality, region, foreign].filter(Boolean)
}

/** The same thing on one line, for a summary row or a picker card. */
export function formatAddressInline(address: Partial<Address>): string {
  return formatAddressLines(address).join(', ')
}

/**
 * Whether an address carries enough to be delivered to.
 *
 * Checkout prefills from a saved address and then lets the customer continue
 * without opening the form. A row saved before `phone` was required would sail
 * past that and fail at the API, on the review step, after they had chosen a
 * payment method — so the picker checks here instead and sends them to the
 * edit dialog while they are still on the address step.
 */
export function isDeliverable(address: Partial<Address> | undefined): boolean {
  if (!address) return false
  return Boolean(
    address.fullName?.trim() &&
      address.phone?.trim() &&
      address.addressLine1?.trim() &&
      address.city?.trim() &&
      address.province?.trim(),
  )
}
