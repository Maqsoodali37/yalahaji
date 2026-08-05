// ─────────────────────────────────────────────────────────────
// Returns (RMA).
//
// Replaces `@/data/orders`, which the returns page used to populate its order
// picker — so the dropdown offered fabricated orders belonging to nobody, and
// "Submit" advanced to a success screen without sending anything.
// ─────────────────────────────────────────────────────────────

import { apiFetch } from './client'
import { paisasToRupees } from './adapters'

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'refunded'

export interface ReturnableOrderItem {
  id: string
  name: string
  quantity: number
  /** rupees */
  price: number
  image?: string
}

export interface ReturnableOrder {
  id: string
  number: string
  /** rupees */
  total: number
  createdAt: string
  items: ReturnableOrderItem[]
}

export interface ReturnRequest {
  id: string
  status: ReturnStatus
  reason: string
  note?: string
  images: string[]
  createdAt: string
  order: {
    id: string
    number: string
    /** rupees */
    total: number
  }
}

interface WireReturnableOrder {
  id: string
  number: string
  total: number
  createdAt: string
  items: Array<{
    id: string
    name: string
    quantity: number
    price: number
    image: string | null
  }>
}

interface WireReturn {
  id: string
  status: ReturnStatus
  reason: string
  note: string | null
  images: string | null
  createdAt: string
  order: { id: string; number: string; total: number }
}

function adaptReturnableOrder(o: WireReturnableOrder): ReturnableOrder {
  return {
    id: o.id,
    number: o.number,
    total: paisasToRupees(o.total),
    createdAt: o.createdAt,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      price: paisasToRupees(i.price),
      image: i.image ?? undefined,
    })),
  }
}

function adaptReturn(r: WireReturn): ReturnRequest {
  let images: string[] = []
  if (r.images) {
    // Stored as a JSON array of URLs. A malformed value must not take the
    // whole account page down with it.
    try {
      const parsed = JSON.parse(r.images)
      if (Array.isArray(parsed)) images = parsed.filter((x): x is string => typeof x === 'string')
    } catch {
      images = []
    }
  }

  return {
    id: r.id,
    status: r.status,
    reason: r.reason,
    note: r.note ?? undefined,
    images,
    createdAt: r.createdAt,
    order: {
      id: r.order.id,
      number: r.order.number,
      total: paisasToRupees(r.order.total),
    },
  }
}

/** Delivered orders still inside the 7-day return window. */
export async function fetchReturnableOrders(): Promise<ReturnableOrder[]> {
  const wire = await apiFetch<WireReturnableOrder[]>('/returns/eligible-orders')
  return wire.map(adaptReturnableOrder)
}

export async function fetchMyReturns(): Promise<ReturnRequest[]> {
  const wire = await apiFetch<WireReturn[]>('/returns/me')
  return wire.map(adaptReturn)
}

export interface CreateReturnInput {
  orderId: string
  reason: string
  note?: string
  images?: string[]
}

export async function createReturn(input: CreateReturnInput): Promise<ReturnRequest> {
  const wire = await apiFetch<WireReturn>('/returns', { method: 'POST', body: input })
  return adaptReturn(wire)
}
