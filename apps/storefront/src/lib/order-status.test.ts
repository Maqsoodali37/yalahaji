import { describe, it, expect } from 'vitest'
import {
  FULFILMENT_STEPS,
  fulfilmentState,
  isTerminalStatus,
  paymentLabel,
} from './order-status'
import type { OrderStatus } from '@/types'

describe('FULFILMENT_STEPS', () => {
  it('excludes cancelled and refunded', () => {
    // They are exits from the track, not points along it. Including them would
    // put a progress bar under an order that is not progressing.
    expect(FULFILMENT_STEPS).not.toContain('cancelled')
    expect(FULFILMENT_STEPS).not.toContain('refunded')
  })

  it('mirrors the API forward path exactly', () => {
    // ORDER_STATUS_FLOW in apps/api/src/orders/orders.service.ts. If the API
    // gains a stage and this does not, the order detail page renders a
    // customer's live order as being at a step that no longer exists.
    expect(FULFILMENT_STEPS).toEqual([
      'pending',
      'confirmed',
      'processing',
      'packed',
      'shipped',
      'out_for_delivery',
      'delivered',
    ])
  })
})

describe('fulfilmentState', () => {
  const ALL: OrderStatus[] = [
    'pending', 'confirmed', 'processing', 'packed',
    'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded',
  ]

  it('gives every status a label, so none renders as undefined', () => {
    for (const status of ALL) {
      expect(fulfilmentState(status).label).toBeTruthy()
    }
  })

  it('reads shipped and out_for_delivery as one customer-facing state', () => {
    // The distinction is operational. A customer wants to know the parcel is
    // moving, not which internal stage it sits in.
    expect(fulfilmentState('shipped')).toEqual(fulfilmentState('out_for_delivery'))
  })

  it('marks the two terminal statuses as stopped', () => {
    expect(fulfilmentState('cancelled').tone).toBe('stopped')
    expect(fulfilmentState('refunded').tone).toBe('stopped')
  })
})

describe('isTerminalStatus', () => {
  it('is true only for cancelled and refunded', () => {
    expect(isTerminalStatus('cancelled')).toBe(true)
    expect(isTerminalStatus('refunded')).toBe(true)
    expect(isTerminalStatus('delivered')).toBe(false)
  })
})

describe('paymentLabel', () => {
  it('calls an unpaid COD order "pay on delivery", not "unpaid"', () => {
    // A COD order is delivered and unpaid for as long as it takes the courier
    // to remit the cash. Showing "Unpaid" there reads as a demand for money
    // the customer has already handed over.
    expect(paymentLabel('unpaid', true)).toBe('Pay on delivery')
  })

  it('still says unpaid when the method is not cash on delivery', () => {
    expect(paymentLabel('unpaid', false)).toBe('Unpaid')
  })

  it('does not soften a refund', () => {
    expect(paymentLabel('refunded', true)).toBe('Refunded')
    expect(paymentLabel('partially_refunded', true)).toBe('Partially refunded')
  })
})
