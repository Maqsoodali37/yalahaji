import { apiFetch, buildQuery } from './client'
import { adaptOrder, paisasToRupees } from './adapters'
import type { Paginated, WireOrder } from './wire'
import type { Order, PaymentMethod, ShippingMethod } from '@/types'

export interface OrderAddressInput {
  label?: string
  fullName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  province: string
  postalCode?: string
}

export interface PlaceOrderInput {
  items: Array<{
    variantId: string
    quantity: number
    hasGiftWrap?: boolean
    giftMessage?: string
  }>
  /** A saved address belonging to the signed-in customer. */
  addressId?: string
  /**
   * Inline address for guest checkout. Exactly one of `addressId` or
   * `address` must be supplied — the API rejects a request with neither.
   */
  address?: OrderAddressInput
  paymentMethod: PaymentMethod
  shippingMethod?: ShippingMethod
  couponCode?: string
  notes?: string
  /** Guest checkout only — ignored when a bearer token is present. */
  guestEmail?: string
  guestPhone?: string
}

/**
 * Place an order.
 *
 * The API recomputes every price, discount and shipping cost from the
 * database — the client sends variant ids and quantities, never amounts. A
 * tampered total therefore cannot affect what is charged.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const wire = await apiFetch<WireOrder>('/orders', { method: 'POST', body: input })
  return adaptOrder(wire)
}

export interface OrderPage {
  items: Order[]
  total: number
  totalPages: number
}

export async function fetchMyOrders(page = 1, limit = 20): Promise<OrderPage> {
  const res = await apiFetch<Paginated<WireOrder>>(`/orders${buildQuery({ page, limit })}`)
  return {
    items: res.items.map(adaptOrder),
    total: res.meta.total,
    totalPages: res.meta.totalPages,
  }
}

/** A customer's own order, by order number. Scoped to them by the API. */
export async function fetchMyOrder(number: string): Promise<Order> {
  const wire = await apiFetch<WireOrder>(`/orders/${encodeURIComponent(number)}`)
  return adaptOrder(wire)
}

export async function cancelOrder(orderId: string): Promise<void> {
  await apiFetch(`/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'PATCH' })
}

/** Public tracking result — deliberately narrower than a full order. */
export interface TrackedOrder {
  number: string
  status: Order['status']
  shippingMethod: ShippingMethod
  trackingNumber?: string
  /** rupees */
  total: number
  createdAt: string
  items: Array<{ name: string; image?: string; quantity: number }>
  timeline: Array<{ status: Order['status']; note?: string; createdAt: string }>
}

/**
 * Track an order without signing in.
 *
 * The order number is the whole credential, which is only safe because it
 * carries a random token (`YH-2026-1001-K7QX9M`). POST rather than GET keeps
 * that number out of URLs, browser history and server logs — treat it like a
 * password in transit, because that is what it now is.
 *
 * `anonymous` suppresses the bearer header: a signed-in customer tracking
 * someone else's parcel — a gift they are chasing for a relative, say —
 * should get the same answer as anyone else holding the number.
 */
export async function trackOrder(number: string): Promise<TrackedOrder> {
  const res = await apiFetch<{
    number: string
    status: Order['status']
    shippingMethod: ShippingMethod
    trackingNumber: string | null
    total: number
    createdAt: string
    items: Array<{ name: string; image: string | null; quantity: number }>
    timeline: Array<{ status: Order['status']; note: string | null; createdAt: string }>
  }>('/orders/track', {
    method: 'POST',
    body: { number: number.trim().toUpperCase() },
    anonymous: true,
  })

  return {
    number: res.number,
    status: res.status,
    shippingMethod: res.shippingMethod,
    trackingNumber: res.trackingNumber ?? undefined,
    total: paisasToRupees(res.total),
    createdAt: res.createdAt,
    items: res.items.map((i) => ({
      name: i.name,
      image: i.image ?? undefined,
      quantity: i.quantity,
    })),
    timeline: res.timeline.map((t) => ({
      status: t.status,
      note: t.note ?? undefined,
      createdAt: t.createdAt,
    })),
  }
}
