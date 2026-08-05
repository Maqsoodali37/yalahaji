import { PaymentMethod } from '@prisma/client'

/**
 * Payment methods a customer can actually complete an order with today.
 *
 * Cash on delivery is the only one. It is also the only method that needs no
 * integration at all — the courier collects, and `Order.paymentStatus` moves on
 * fulfilment rather than on a callback.
 *
 * JazzCash, Easypaisa and card are in the `PaymentMethod` enum but no gateway
 * integration exists — no redirect, no callback, and nothing that ever moves
 * `paymentStatus` off `unpaid`. Selecting one produced an order that looked
 * paid to the customer and was indistinguishable from an unpaid one to
 * fulfilment.
 *
 * `bank_transfer` is deliberately absent from both lists: the business has
 * decided not to support it, so it is neither offered nor "coming soon".
 *
 * The enum value itself is kept. Removing it would need a migration and would
 * fail against any historical row that holds it, and admin and order-detail
 * screens must still be able to render such an order.
 *
 * When a gateway ships, move its method here and drop it from
 * `COMING_SOON_PAYMENT_METHODS` — the storefront reads the same two lists, so
 * the checkout options follow automatically.
 */
export const ENABLED_PAYMENT_METHODS: PaymentMethod[] = [PaymentMethod.cod]

export const COMING_SOON_PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.jazzcash,
  PaymentMethod.easypaisa,
  PaymentMethod.card,
]

export function isPaymentMethodEnabled(method: PaymentMethod): boolean {
  return ENABLED_PAYMENT_METHODS.includes(method)
}
