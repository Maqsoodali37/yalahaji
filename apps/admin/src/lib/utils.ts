import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { OrderStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Money ────────────────────────────────────────────────────
// The API stores money in paisas (rupees × 100).

export function paisasToRupees(paisas: number): number {
  return paisas / 100
}

export function rupeesToPaisas(rupees: number): number {
  return Math.round(rupees * 100)
}

/** Format a paisa amount as display currency, e.g. 149900 → "₨1,499" */
export function formatPrice(paisas: number, opts: { decimals?: boolean } = {}) {
  const rupees = paisasToRupees(paisas)
  return `₨${rupees.toLocaleString('en-PK', {
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  })}`
}

/** Compact display for KPI cards, e.g. 1250000 paisas → "₨12.5K" */
export function formatPriceCompact(paisas: number) {
  const rupees = paisasToRupees(paisas)
  if (rupees >= 10_000_000) return `₨${(rupees / 10_000_000).toFixed(1)}Cr`
  if (rupees >= 100_000) return `₨${(rupees / 100_000).toFixed(1)}L`
  if (rupees >= 1_000) return `₨${(rupees / 1_000).toFixed(1)}K`
  return `₨${rupees.toLocaleString('en-PK')}`
}

// ─── Dates ────────────────────────────────────────────────────

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

// ─── Strings ──────────────────────────────────────────────────

export function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function truncate(str: string, length: number) {
  return str.length > length ? str.slice(0, length) + '…' : str
}

export function titleCase(str: string) {
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Order status ─────────────────────────────────────────────

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
]

/**
 * Statuses an order can legally move to from its current one.
 *
 * This mirrors `ORDER_STATUS_FLOW` in apps/api (orders.service.ts) — the server
 * enforces the same map, so a status offered here that the API rejects (as the
 * old `returned` value did) is a bug. Change one, change both.
 */
export function nextStatuses(current: OrderStatus): OrderStatus[] {
  const flow: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['packed', 'cancelled'],
    packed: ['shipped', 'cancelled'],
    shipped: ['out_for_delivery'],
    out_for_delivery: ['delivered'],
    delivered: ['refunded'],
    cancelled: [],
    refunded: [],
  }
  return flow[current] ?? []
}

export function statusClasses(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending: 'bg-gold-tint text-gold-deep',
    confirmed: 'bg-green-tint text-green',
    processing: 'bg-blue-50 text-[#1D6FA5]',
    packed: 'bg-blue-50 text-[#1D6FA5]',
    shipped: 'bg-purple-50 text-[#5B47B0]',
    out_for_delivery: 'bg-purple-50 text-[#5B47B0]',
    delivered: 'bg-green-light text-[#137A4C]',
    cancelled: 'bg-red-50 text-alert',
    refunded: 'bg-orange-50 text-[#8A5A2B]',
  }
  return map[status] ?? 'bg-paper text-ink-3'
}

export function paymentStatusClasses(status: string) {
  const map: Record<string, string> = {
    paid: 'bg-green-light text-[#137A4C]',
    unpaid: 'bg-gold-tint text-gold-deep',
    partially_refunded: 'bg-orange-50 text-[#8A5A2B]',
    refunded: 'bg-red-50 text-alert',
  }
  return map[status] ?? 'bg-paper text-ink-3'
}

// ─── Filter option lists (mirror the Prisma enums) ────────────

export const PAYMENT_STATUSES = ['unpaid', 'paid', 'partially_refunded', 'refunded'] as const
export const PAYMENT_METHODS = ['cod', 'jazzcash', 'easypaisa', 'bank_transfer', 'card'] as const
export const SHIPPING_METHODS = ['standard', 'express', 'cod'] as const

// ─── Returns ──────────────────────────────────────────────────

export const RETURN_STATUSES = ['requested', 'approved', 'rejected', 'received', 'refunded'] as const

/** Return-queue transitions — mirrors RETURN_STATUS_FLOW in apps/api. */
export function nextReturnStatuses(current: string): string[] {
  const flow: Record<string, string[]> = {
    requested: ['approved', 'rejected'],
    approved: ['received', 'rejected'],
    received: ['refunded'],
    rejected: [],
    refunded: [],
  }
  return flow[current] ?? []
}

export function returnStatusClasses(status: string) {
  const map: Record<string, string> = {
    requested: 'bg-gold-tint text-gold-deep',
    approved: 'bg-blue-50 text-[#1D6FA5]',
    received: 'bg-purple-50 text-[#5B47B0]',
    refunded: 'bg-green-light text-[#137A4C]',
    rejected: 'bg-red-50 text-alert',
  }
  return map[status] ?? 'bg-paper text-ink-3'
}

// ─── Stock ────────────────────────────────────────────────────

export function stockLevel(stock: number, threshold: number) {
  if (stock === 0) return { label: 'Out of stock', cls: 'bg-red-50 text-alert' }
  if (stock <= threshold) return { label: 'Low stock', cls: 'bg-gold-tint text-gold-deep' }
  return { label: 'In stock', cls: 'bg-green-light text-[#137A4C]' }
}

/** Lowest active variant price on a product, in paisas. */
export function lowestPrice(variants: { price: number; isActive?: boolean }[]) {
  const active = variants.filter((v) => v.isActive !== false)
  if (active.length === 0) return 0
  return Math.min(...active.map((v) => v.price))
}

export function totalStock(variants: { stock: number }[]) {
  return variants.reduce((sum, v) => sum + v.stock, 0)
}
