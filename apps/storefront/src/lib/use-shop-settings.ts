'use client'

import { useCartStore } from '@/store/cart'
import { formatPrice } from '@/lib/utils'
import type { StoreSettings } from '@/lib/api'

/**
 * Shop configuration for client components.
 *
 * The settings are fetched **once** per page load by `CartBootstrap` and held
 * in the cart store; this hook is a read of that, not another request. Every
 * component that needs a shipping threshold, a COD fee or a currency symbol
 * should come through here rather than fetching for itself — a dozen
 * components each calling `/settings/public` is a dozen round trips for one
 * answer that cannot differ between them.
 *
 * Before the fetch resolves this returns `SETTINGS_FALLBACK`, which mirrors
 * the seeded config, so the first paint shows the same figure the server would
 * charge against rather than a zero or a spinner.
 */
export function useShopSettings(): StoreSettings {
  return useCartStore((s) => s.settings)
}

/**
 * The free-shipping threshold, ready to drop into a message.
 *
 * Returned pre-formatted because every caller wants the same thing — the
 * amount with the configured currency symbol — and hand-formatting is how
 * `₨2,999` ended up baked into six components and three translation files.
 * `formatPrice` is the site's formatter and already knows the symbol the shop
 * is configured with, so a shop switching to another currency needs no code
 * change here either.
 */
export function useFreeShippingThreshold(): {
  /** Rupees, for comparisons. */
  amount: number
  /** e.g. "₨2,999" — for display. */
  formatted: string
  /** False when the shop has turned free shipping off entirely. */
  isOffered: boolean
} {
  const amount = useCartStore((s) => s.settings.freeShippingThreshold)

  return {
    amount,
    formatted: formatPrice(amount),
    // A threshold of 0 means every order ships free, and a negative value is
    // corrupt config. Neither should render "free shipping over ₨0", which
    // reads as a mistake even when it is not.
    isOffered: amount > 0,
  }
}
