/**
 * The country every address has until the shop ships abroad.
 *
 * Duplicated from the storefront's `lib/address.ts` rather than imported —
 * the two apps share no code — and from the `country` column default in
 * schema.prisma. Three copies, so the day this changes it changes in three
 * places or the admin order screen quietly disagrees with the storefront
 * about which addresses are worth showing a country for.
 */
export const DEFAULT_COUNTRY = 'Pakistan'
