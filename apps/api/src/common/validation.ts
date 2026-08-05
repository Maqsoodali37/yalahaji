/**
 * Validation constants shared across DTOs.
 *
 * These mirror `apps/storefront/src/lib/validation.ts`. The storefront copy
 * exists to give a customer a usable message before a round trip; this copy is
 * the one that actually protects the database. When one changes, change both —
 * a storefront rule that is looser than the API's produces a rejection the
 * customer was never warned about, and one that is tighter silently blocks
 * input the business accepts.
 */

/** Matches the storefront's `normalisePhone` output. */
export const PAKISTANI_PHONE_REGEX = /^\+92[0-9]{10}$/

export const PAKISTANI_PHONE_MESSAGE =
  'Phone must be a valid Pakistani number (+92XXXXXXXXXX)'

/** Pakistan Post uses five digits. */
export const POSTAL_CODE_REGEX = /^[0-9]{5}$/

export const POSTAL_CODE_MESSAGE = 'Postal code must be 5 digits'

/**
 * Length caps. Chosen to sit inside the column widths in schema.prisma rather
 * than to express a business opinion — an unbounded string on a `VARCHAR(191)`
 * column is a 500 waiting to happen, and on a `TEXT` column it is a way to
 * post a megabyte of prose into a review.
 */
export const MAX_NAME = 120
export const MAX_CITY = 80
export const MAX_ADDRESS_LINE = 200
export const MAX_LABEL = 40
export const MAX_REVIEW_TITLE = 120
export const MAX_REVIEW_BODY = 4000
export const MAX_GIFT_MESSAGE = 500
export const MAX_ORDER_NOTES = 1000
export const MAX_COUPON_CODE = 40
export const MAX_RETURN_REASON = 2000

/** Guards against a single order being used to place a wholesale order. */
export const MAX_ORDER_ITEMS = 50
export const MAX_ITEM_QUANTITY = 99
