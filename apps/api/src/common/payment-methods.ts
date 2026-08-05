import { PaymentMethod } from '@prisma/client'

/**
 * Payment methods a customer can actually complete an order with today.
 *
 * JazzCash, Easypaisa and card are in the `PaymentMethod` enum but no gateway
 * integration exists — there is no redirect, no callback, and nothing that ever
 * moves `Order.paymentStatus` off `unpaid`. Selecting one of them produced an
 * order that looked paid to the customer and was indistinguishable from an
 * unpaid one to fulfilment.
 *
 * Both remaining methods work without a gateway: cash is collected on delivery,
 * and a bank transfer is reconciled by hand.
 *
 * When a gateway ships, move its method here and drop it from
 * `COMING_SOON_PAYMENT_METHODS` — the storefront reads the same two lists, so
 * the checkout options follow automatically.
 */
export const ENABLED_PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.cod,
  PaymentMethod.bank_transfer,
]

export const COMING_SOON_PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.jazzcash,
  PaymentMethod.easypaisa,
  PaymentMethod.card,
]

export function isPaymentMethodEnabled(method: PaymentMethod): boolean {
  return ENABLED_PAYMENT_METHODS.includes(method)
}
