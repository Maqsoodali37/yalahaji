import type { OrderStatus, PaymentStatus } from '@/types'

/**
 * The stages an order moves through on the way to the door, in order.
 *
 * Mirrors the forward path of `ORDER_STATUS_FLOW` in the API's
 * `orders.service.ts`. `cancelled` and `refunded` are deliberately absent:
 * they are exits from this track, not points along it, and including them
 * would put a progress bar under an order that is not progressing.
 */
export const FULFILMENT_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
]

export function isTerminalStatus(status: OrderStatus): boolean {
  return status === 'cancelled' || status === 'refunded'
}

export type FulfilmentTone = 'pending' | 'active' | 'done' | 'stopped'

export interface FulfilmentState {
  label: string
  tone: FulfilmentTone
}

/**
 * A customer-facing fulfilment state, derived from the order status.
 *
 * There is no `fulfilmentStatus` column: the shop has one warehouse, no
 * courier integration and no partial shipments, so a second status field would
 * have to be maintained by hand alongside the first and would be wrong the
 * first time someone forgot. Deriving it means the two can never disagree.
 *
 * If shipments ever become their own model — the enterprise-OMS work in
 * TASKS.md — this is the single place that needs to start reading it.
 */
export function fulfilmentState(status: OrderStatus): FulfilmentState {
  switch (status) {
    case 'pending':
      return { label: 'Awaiting confirmation', tone: 'pending' }
    case 'confirmed':
    case 'processing':
      return { label: 'Preparing', tone: 'active' }
    case 'packed':
      return { label: 'Ready to ship', tone: 'active' }
    case 'shipped':
    case 'out_for_delivery':
      return { label: 'In transit', tone: 'active' }
    case 'delivered':
      return { label: 'Delivered', tone: 'done' }
    case 'cancelled':
      return { label: 'Cancelled', tone: 'stopped' }
    case 'refunded':
      return { label: 'Refunded', tone: 'stopped' }
  }
}

/**
 * Payment status in the customer's words.
 *
 * Kept separate from fulfilment because for cash on delivery the two genuinely
 * disagree for a while: an order is `delivered` and still `unpaid` between the
 * courier handing the parcel over and the cash being remitted. Rendering one
 * badge for both told customers their delivered order was unpaid, which reads
 * as a demand for money they have already handed over.
 */
export function paymentLabel(
  paymentStatus: PaymentStatus,
  isCashOnDelivery: boolean,
): string {
  switch (paymentStatus) {
    case 'paid':
      return 'Paid'
    case 'partially_refunded':
      return 'Partially refunded'
    case 'refunded':
      return 'Refunded'
    case 'unpaid':
      return isCashOnDelivery ? 'Pay on delivery' : 'Unpaid'
  }
}

/** Tailwind classes per payment status, so the four screens agree on colour. */
export const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  unpaid: 'bg-gold/20 text-ink',
  paid: 'bg-green/15 text-green',
  partially_refunded: 'bg-stone/15 text-stone',
  refunded: 'bg-stone/15 text-stone',
}

export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  packed: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-stone/10 text-stone',
}

export const SHIPPING_METHOD_LABEL: Record<string, string> = {
  standard: 'Standard delivery',
  express: 'Express delivery',
  cod: 'Cash on delivery',
}
