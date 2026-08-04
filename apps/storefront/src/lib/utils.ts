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
