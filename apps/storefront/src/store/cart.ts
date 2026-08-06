import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Tier } from '@/types'
import { generateCartItemId, setCurrencySymbol } from '@/lib/utils'
import {
  fetchCart,
  upsertCartItem,
  removeCartItem,
  clearCart as apiClearCart,
  validateCoupon,
  fetchSettings,
  SETTINGS_FALLBACK,
  type StoreSettings,
} from '@/lib/api'
import {
  toAnalyticsItem,
  trackAddToCart,
  trackRemoveFromCart,
} from '@/lib/analytics'

interface AddToCartPayload {
  productId: string
  variantId: string
  slug: string
  name: string
  image: string
  tier: Tier
  size?: string
  color?: string
  colorHex?: string
  scent?: string
  price: number
  compareAtPrice?: number
  hasGiftWrap?: boolean
  giftMessage?: string
}

interface CartStore {
  items: CartItem[]
  couponCode: string | undefined
  couponDiscount: number
  isOpen: boolean
  settings: StoreSettings
  /** Set when a server write fails; the UI keeps the optimistic local state. */
  syncError: string | null

  // Computed
  itemCount: () => number
  subtotal: () => number
  shipping: () => number
  total: () => number
  freeShippingProgress: () => number

  // Actions — synchronous surface, server writes fire in the background
  addItem: (payload: AddToCartPayload, quantity?: number) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  toggleGiftWrap: (cartItemId: string) => void
  setGiftMessage: (cartItemId: string, message: string) => void
  applyCoupon: (code: string) => Promise<boolean>
  removeCoupon: () => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void

  // Server sync
  syncFromServer: () => Promise<void>
  loadSettings: () => Promise<void>
}

/**
 * Fire a server write without blocking the UI.
 *
 * The cart is optimistic: local state updates immediately and the network
 * catches up. A failed write leaves the optimistic item in place and records
 * `syncError` — dropping the item under the customer's cursor because a
 * request timed out would be worse than a briefly divergent cart, and the
 * next `syncFromServer()` reconciles it either way.
 */
function background(op: () => Promise<unknown>, set: (partial: Partial<CartStore>) => void) {
  op().catch((e: Error) => set({ syncError: e.message }))
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: undefined,
      couponDiscount: 0,
      isOpen: false,
      settings: SETTINGS_FALLBACK,
      syncError: null,

      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      subtotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      /**
       * Threshold and cost now come from the API rather than a hardcoded
       * ₨5,000 that disagreed with the ₨2,999 the server actually charges
       * against — the progress bar and the invoice used to contradict
       * each other.
       */
      shipping: () => {
        const { settings } = get()
        const afterDiscount = get().subtotal() - get().couponDiscount
        return afterDiscount >= settings.freeShippingThreshold ? 0 : settings.standardShippingCost
      },

      total: () => {
        const sub = get().subtotal()
        return Math.max(0, sub - get().couponDiscount + get().shipping())
      },

      freeShippingProgress: () => {
        const { settings } = get()
        if (settings.freeShippingThreshold <= 0) return 100
        return Math.min(100, (get().subtotal() / settings.freeShippingThreshold) * 100)
      },

      addItem: (payload, quantity = 1) => {
        const existing = get().items.find(
          (i) => i.productId === payload.productId && i.variantId === payload.variantId,
        )
        const newQuantity = existing ? existing.quantity + quantity : quantity

        set((state) =>
          existing
            ? {
                items: state.items.map((i) =>
                  i.id === existing.id ? { ...i, quantity: newQuantity } : i,
                ),
                syncError: null,
              }
            : {
                items: [
                  ...state.items,
                  {
                    id: generateCartItemId(),
                    ...payload,
                    quantity,
                    hasGiftWrap: payload.hasGiftWrap ?? false,
                  },
                ],
                syncError: null,
              },
        )

        // Fired here rather than at the four call sites (product page, product
        // card, kit builder, compare) so every path into the cart is measured
        // and none can drift. `quantity` is the delta added, not the new
        // running total — GA4 reports add_to_cart as units added.
        trackAddToCart([toAnalyticsItem({ ...payload, quantity })])

        // The API upserts on variantId and takes an absolute quantity, so the
        // running total is what goes over the wire, not the delta.
        background(
          () =>
            upsertCartItem({
              variantId: payload.variantId,
              quantity: newQuantity,
              hasGiftWrap: payload.hasGiftWrap,
              giftMessage: payload.giftMessage,
            }).then(() => get().syncFromServer()),
          set,
        )
      },

      removeItem: (cartItemId) => {
        const item = get().items.find((i) => i.id === cartItemId)
        set((state) => ({ items: state.items.filter((i) => i.id !== cartItemId) }))

        if (item) trackRemoveFromCart([toAnalyticsItem(item)])

        // Locally-generated ids (`ci-…`) belong to items the server never
        // acknowledged, so there is nothing to delete server-side.
        if (item && !cartItemId.startsWith('ci-')) {
          background(() => removeCartItem(cartItemId), set)
        }
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId)
          return
        }

        const item = get().items.find((i) => i.id === cartItemId)
        set((state) => ({
          items: state.items.map((i) => (i.id === cartItemId ? { ...i, quantity } : i)),
        }))

        if (item) {
          // A stepper change is an add or a remove of the delta, not of the
          // whole line — sending the full quantity here would double-count
          // against the original add_to_cart.
          const delta = quantity - item.quantity
          if (delta > 0) {
            trackAddToCart([toAnalyticsItem({ ...item, quantity: delta })])
          } else if (delta < 0) {
            trackRemoveFromCart([toAnalyticsItem({ ...item, quantity: -delta })])
          }

          background(
            () =>
              upsertCartItem({
                variantId: item.variantId,
                quantity,
                hasGiftWrap: item.hasGiftWrap,
                giftMessage: item.giftMessage,
              }),
            set,
          )
        }
      },

      toggleGiftWrap: (cartItemId) => {
        const item = get().items.find((i) => i.id === cartItemId)
        if (!item) return
        const hasGiftWrap = !item.hasGiftWrap

        set((state) => ({
          items: state.items.map((i) => (i.id === cartItemId ? { ...i, hasGiftWrap } : i)),
        }))

        background(
          () =>
            upsertCartItem({
              variantId: item.variantId,
              quantity: item.quantity,
              hasGiftWrap,
              giftMessage: item.giftMessage,
            }),
          set,
        )
      },

      setGiftMessage: (cartItemId, message) => {
        const item = get().items.find((i) => i.id === cartItemId)
        if (!item) return

        set((state) => ({
          items: state.items.map((i) => (i.id === cartItemId ? { ...i, giftMessage: message } : i)),
        }))

        background(
          () =>
            upsertCartItem({
              variantId: item.variantId,
              quantity: item.quantity,
              hasGiftWrap: item.hasGiftWrap,
              giftMessage: message,
            }),
          set,
        )
      },

      /**
       * Now validated server-side, replacing the hardcoded rate table. That
       * table applied percentages the database never agreed to and ignored
       * expiry, usage limits and minimum-order rules entirely — a customer
       * could apply a long-dead code and watch the total drop.
       */
      applyCoupon: async (code) => {
        const result = await validateCoupon(code, get().subtotal())
        if (!result.valid) {
          set({ couponCode: undefined, couponDiscount: 0 })
          return false
        }
        set({ couponCode: result.code ?? code.toUpperCase(), couponDiscount: result.discount })
        return true
      },

      removeCoupon: () => set({ couponCode: undefined, couponDiscount: 0 }),

      clearCart: () => {
        set({ items: [], couponCode: undefined, couponDiscount: 0 })
        background(() => apiClearCart(), set)
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      /**
       * The server is authoritative: it knows real stock, real prices, and the
       * merged contents of a guest cart after sign-in. Local state is only a
       * head start for first paint.
       */
      syncFromServer: async () => {
        try {
          const items = await fetchCart()
          set({ items, syncError: null })
        } catch (e) {
          set({ syncError: (e as Error).message })
        }
      },

      loadSettings: async () => {
        const settings = await fetchSettings()
        // Applied before `set` so the first render that reacts to the new
        // settings already formats prices with the configured symbol.
        setCurrencySymbol(settings.currencySymbol)
        set({ settings })
      },
    }),
    {
      name: 'yalahaji-cart',
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
        couponDiscount: state.couponDiscount,
      }),
    },
  ),
)
