import type { PaymentMethod } from '@/types'

/**
 * Checkout payment options.
 *
 * Mirrors `apps/api/src/common/payment-methods.ts`. JazzCash, Easypaisa and
 * card exist in the `PaymentMethod` enum but no gateway integration does — no
 * redirect, no callback, and nothing that ever moves an order off `unpaid`.
 * Offering them produced orders that looked paid to the customer and were
 * indistinguishable from unpaid ones to fulfilment.
 *
 * They are shown rather than hidden so shoppers can see they are on the way,
 * but they are not selectable. When a gateway ships, flip `comingSoon` here and
 * add the method to `ENABLED_PAYMENT_METHODS` on the API — both are required,
 * since the DTO validates against its own list.
 *
 * `bank_transfer` is intentionally not listed at all. The business does not
 * support it, so it is not an option and not "coming soon" either. The value
 * stays in the `PaymentMethod` union only so historical orders still render.
 */
export interface PaymentOption {
  key: PaymentMethod
  label: string
  icon: string
  desc: string
  badge?: string
  comingSoon?: boolean
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    key: 'cod',
    label: 'Cash on Delivery',
    icon: '💵',
    desc: 'Open & check first, then pay.',
    badge: 'Most Popular',
  },
  {
    key: 'jazzcash',
    label: 'JazzCash',
    icon: '💳',
    desc: 'Pay via JazzCash mobile wallet',
    comingSoon: true,
  },
  {
    key: 'easypaisa',
    label: 'Easypaisa',
    icon: '📱',
    desc: 'Pay via Easypaisa mobile wallet',
    comingSoon: true,
  },
  {
    key: 'card',
    label: 'Credit / Debit Card',
    icon: '💳',
    desc: 'Visa, Mastercard — secure payment',
    comingSoon: true,
  },
]

export const ENABLED_PAYMENT_OPTIONS = PAYMENT_OPTIONS.filter((o) => !o.comingSoon)

export const COMING_SOON_PAYMENT_OPTIONS = PAYMENT_OPTIONS.filter((o) => o.comingSoon)

/**
 * What a fresh checkout starts on. Previously `jazzcash`, which is now not a
 * selectable option at all — anyone who clicked straight through the payment
 * step would have submitted it.
 */
export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'cod'

export function isPaymentMethodEnabled(method: PaymentMethod): boolean {
  return ENABLED_PAYMENT_OPTIONS.some((o) => o.key === method)
}
