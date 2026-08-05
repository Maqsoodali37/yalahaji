import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ProductVariant, Tier } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number, currency = '₨') {
  return `${currency}${amount.toLocaleString('en-PK')}`
}

export function formatDiscount(original: number, sale: number) {
  return Math.round(((original - sale) / original) * 100)
}

export function getLowestPrice(variants: ProductVariant[]): number {
  return Math.min(...variants.map((v) => v.price))
}

/**
 * The variant a product should be represented by before the shopper picks one.
 *
 * Cheapest in stock, falling back to the cheapest overall when everything is
 * out of stock. Every surface must agree on this: the card, the product page
 * and add-to-cart each used to decide independently — the card *displayed*
 * `getLowestPrice()` but *added* `variants[0]`, and the product page opened on
 * `variants[0]` too. Since the API returned variants in no particular order,
 * a product could advertise ₨1,199, open at ₨4,999, and put ₨4,999 in the
 * basket when the shopper clicked the price they were shown.
 */
export function getDefaultVariant(variants: ProductVariant[]): ProductVariant | undefined {
  if (variants.length === 0) return undefined

  const byPriceAsc = [...variants].sort((a, b) => a.price - b.price)
  return byPriceAsc.find((v) => v.stock > 0) ?? byPriceAsc[0]
}

/** True when variants differ in price, so a single figure needs a "From". */
export function hasPriceRange(variants: ProductVariant[]): boolean {
  if (variants.length < 2) return false
  const { min, max } = getPriceRange(variants)
  return min !== max
}

export function getHighestPrice(variants: ProductVariant[]): number {
  return Math.max(...variants.map((v) => v.price))
}

export function getPriceRange(variants: ProductVariant[]) {
  const prices = variants.map((v) => v.price)
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

export function getTierBadgeClass(tier: Tier) {
  const map: Record<Tier, string> = {
    Economy: 'badge-eco',
    Standard: 'badge-std',
    Premium: 'badge-prm',
  }
  return map[tier]
}

export function getTierTextClass(tier: Tier) {
  const map: Record<Tier, string> = {
    Economy: 'tier-economy',
    Standard: 'tier-standard',
    Premium: 'tier-premium',
  }
  return map[tier]
}

export function renderStars(rating: number): string {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty)
}

export function truncate(str: string, length: number) {
  return str.length > length ? str.slice(0, length) + '…' : str
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function generateCartItemId() {
  return `ci-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const FREE_SHIPPING_THRESHOLD = 5000
