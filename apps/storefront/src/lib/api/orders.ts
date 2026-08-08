import { apiFetch, buildQuery } from './client'
import { adaptOrder, paisasToRupees } from './adapters'
import type { Paginated, WireOrder } from './wire'
import type { Order, PaymentMethod, ShippingMethod } from '@/types'

export interface OrderAddressInput {
  label?: string
  fullName: string
  phone: string
  email?: string
  addressLine1: string
  addressLine2?: string
  area?: string
  city: string
  province: string
  country?: string
  labelType?: 'home' | 'office' | 'other'
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
  /**
   * Keep `address` in the customer's address book. This is what lets someone
   * add a delivery address during checkout without navigating away and losing
   * the basket state they have built up. Ignored for guests — there is no
   * account to save it to.
   */
  saveAddress?: boolean
  /** Only meaningful with `saveAddress`. Demotes the current default. */
  setDefaultAddress?: boolean
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
  /** Every order on the account, not the length of `items`. */
  total: number
  page: number
  limit: number
  totalPages: number
}

/** What the order list shows per page. */
export const ORDERS_PER_PAGE = 10

/**
 * A page of the customer's own orders, newest first.
 *
 * Paginated server-side rather than fetched whole and sliced: an account with
 * a few hundred orders would otherwise pull every line item, timeline entry
 * and address on the account to render ten rows, on a connection that is
 * mostly mobile. `page` and `limit` are echoed back so the "Showing 1–10 of
 * 125" line reads from the response rather than from what the caller asked
 * for — the two differ when someone deep-links a page past the end.
 *
 * The API's default sort is `createdAt desc`, which is the order this screen
 * wants, so no sort parameter is sent.
 */
export async function fetchMyOrders(
  page = 1,
  limit = ORDERS_PER_PAGE,
): Promise<OrderPage> {
  const res = await apiFetch<Paginated<WireOrder>>(`/orders${buildQuery({ page, limit })}`)
  return {
    items: res.items.map(adaptOrder),
    total: res.meta.total,
    page: res.meta.page,
    limit: res.meta.limit,
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
