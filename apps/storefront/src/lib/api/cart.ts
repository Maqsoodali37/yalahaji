import { apiFetch } from './client'
import { ensureSessionId, clearSessionId, getStoredSessionId } from './session'
import { adaptCartItem, paisasToRupees } from './adapters'
import type { WireCartItem, WireCouponValidation } from './wire'
import type { CartItem } from '@/types'
import { isAuthenticated } from './auth'

/**
 * Every cart call needs an owner. Signed-in shoppers are identified by their
 * bearer token; guests need a server-signed session id, which we mint lazily
 * on first use. Requesting one for an authenticated shopper would be wasted
 * work — the API ignores the header once a token is present.
 */
async function cartHeaders(): Promise<{ sessionId?: string }> {
  if (isAuthenticated()) return {}
  return { sessionId: await ensureSessionId() }
}

export async function fetchCart(): Promise<CartItem[]> {
  const { sessionId } = await cartHeaders()
  const wire = await apiFetch<WireCartItem[]>('/cart', { sessionId })
  return wire.map(adaptCartItem)
}

export async function upsertCartItem(input: {
  variantId: string
  quantity: number
  hasGiftWrap?: boolean
  giftMessage?: string
}): Promise<CartItem> {
  const { sessionId } = await cartHeaders()
  const wire = await apiFetch<WireCartItem>('/cart', {
    method: 'POST',
    body: input,
    sessionId,
  })
  return adaptCartItem(wire)
}

export async function removeCartItem(cartItemId: string): Promise<void> {
  const { sessionId } = await cartHeaders()
  await apiFetch(`/cart/${encodeURIComponent(cartItemId)}`, { method: 'DELETE', sessionId })
}

export async function clearCart(): Promise<void> {
  const { sessionId } = await cartHeaders()
  await apiFetch('/cart', { method: 'DELETE', sessionId })
}

/**
 * Fold the guest cart into the user's cart after login.
 *
 * The guest session is dropped afterwards: keeping it would leave the shopper
 * with a stale second cart that reappears the moment they sign out.
 */
export async function mergeGuestCart(): Promise<number> {
  const sessionId = getStoredSessionId()
  if (!sessionId) return 0

  try {
    const { merged } = await apiFetch<{ merged: number }>('/cart/merge', {
      method: 'POST',
      sessionId,
    })
    return merged
  } finally {
    clearSessionId()
  }
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export interface CouponResult {
  valid: boolean
  /** rupees */
  discount: number
  code?: string
  message?: string
}

/**
 * Server-side validation replaces the storefront's hardcoded WELCOME10 /
 * HAJJ2025 table, so expiry, usage limits and minimum-order rules are actually
 * enforced rather than assumed.
 *
 * `subtotal` goes out in paisas because the API works in paisas throughout;
 * the discount comes back in paisas and is converted for display.
 */
export async function validateCoupon(code: string, subtotalRupees: number): Promise<CouponResult> {
  try {
    const res = await apiFetch<WireCouponValidation>('/coupons/validate', {
      method: 'POST',
      body: { code: code.trim().toUpperCase(), subtotal: Math.round(subtotalRupees * 100) },
      anonymous: true,
    })
    return {
      valid: res.valid,
      discount: paisasToRupees(res.discount),
      code: res.code,
      message: res.message,
    }
  } catch (e) {
    return { valid: false, discount: 0, message: (e as Error).message }
  }
}
