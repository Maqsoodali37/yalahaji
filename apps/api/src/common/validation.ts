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
 * Lowercase, hyphen-separated, URL-safe — no leading/trailing hyphen and no
 * doubled one in the middle. Slugs were previously accepted as any string;
 * nothing stopped "Ihram Sets!!" reaching the database and becoming the
 * literal URL segment.
 */
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const SLUG_MESSAGE =
  'Slug must be lowercase letters, numbers and single hyphens (e.g. "ihram-sets")'

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
/** A named locality within a city — "DHA Phase 5", "Gulberg III". */
export const MAX_AREA = 120
export const MAX_EMAIL = 160
export const MAX_COUNTRY = 80

/**
 * Countries the shop will actually ship to.
 *
 * Enforced server-side for the same reason `ENABLED_PAYMENT_METHODS` is:
 * offering one option in the storefront picker does not stop a hand-rolled
 * request from saving an address the shop cannot deliver to, and the first
 * anyone would learn of it is a courier refusing the parcel.
 *
 * Typed as a mutable `string[]` rather than `as const` to match
 * `ENABLED_PAYMENT_METHODS`, the existing `@IsIn` precedent in this codebase.
 * class-validator only widened `IsIn` to accept a `readonly` array in 0.14, and
 * nothing here needs the literal union.
 */
export const SUPPORTED_COUNTRIES: string[] = ['Pakistan']
export const MAX_REVIEW_TITLE = 120
export const MAX_REVIEW_BODY = 4000
export const MAX_GIFT_MESSAGE = 500
export const MAX_ORDER_NOTES = 1000
export const MAX_COUPON_CODE = 40
export const MAX_RETURN_REASON = 2000

/**
 * Product media. Admin-side only, so unlike the constants above these have no
 * storefront mirror to keep in step. Both sit on Prisma's default MySQL
 * `VARCHAR(191)`; a longer value is a 500 from the driver, not a validation
 * error the person filling the form can act on.
 */
export const MAX_MEDIA_URL = 191
export const MAX_MEDIA_ALT = 191

/** Per-locale SEO fields on categories and products. */
export const MAX_SEO_TITLE = 60
export const MAX_SEO_DESC = 320
/**
 * Comma-separated keyword list. Sits on a TEXT column, so this cap is an
 * editorial limit rather than a column width — past roughly this length a
 * keyword list has stopped being a signal and started being a list.
 */
export const MAX_SEO_KEYWORDS = 255

/** Guards against a single order being used to place a wholesale order. */
export const MAX_ORDER_ITEMS = 50
export const MAX_ITEM_QUANTITY = 99
