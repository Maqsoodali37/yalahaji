import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Tier } from '@/types'
import { generateCartItemId, FREE_SHIPPING_THRESHOLD } from '@/lib/utils'

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

  // Computed
  itemCount: () => number
  subtotal: () => number
  shipping: () => number
  total: () => number
  freeShippingProgress: () => number

  // Actions
  addItem: (payload: AddToCartPayload, quantity?: number) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  toggleGiftWrap: (cartItemId: string) => void
  setGiftMessage: (cartItemId: string, message: string) => void
  applyCoupon: (code: string) => boolean
  removeCoupon: () => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

const VALID_COUPONS: Record<string, number> = {
  WELCOME10: 0.1,
  HAJJ2025: 0.15,
  UMRAH5: 0.05,
  RAMADAN20: 0.2,
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: undefined,
      couponDiscount: 0,
      isOpen: false,

      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      shipping: () => {
        const sub = get().subtotal()
        const discount = get().couponDiscount
        return sub - discount >= FREE_SHIPPING_THRESHOLD ? 0 : 299
      },

      total: () => {
        const sub = get().subtotal()
        const discount = get().couponDiscount
        const shipping = get().shipping()
        return Math.max(0, sub - discount + shipping)
      },

      freeShippingProgress: () => {
        const sub = get().subtotal()
        return Math.min(100, (sub / FREE_SHIPPING_THRESHOLD) * 100)
      },

      addItem: (payload, quantity = 1) => {
        set((state) => {
          const existing = state.items.find(
            (i) =>
              i.productId === payload.productId &&
              i.variantId === payload.variantId
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === existing.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            }
          }
          const newItem: CartItem = {
            id: generateCartItemId(),
            ...payload,
            quantity,
            hasGiftWrap: payload.hasGiftWrap ?? false,
          }
          return { items: [...state.items, newItem] }
        })
      },

      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== cartItemId),
        })),

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === cartItemId ? { ...i, quantity } : i
          ),
        }))
      },

      toggleGiftWrap: (cartItemId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === cartItemId ? { ...i, hasGiftWrap: !i.hasGiftWrap } : i
          ),
        })),

      setGiftMessage: (cartItemId, message) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === cartItemId ? { ...i, giftMessage: message } : i
          ),
        })),

      applyCoupon: (code) => {
        const rate = VALID_COUPONS[code.toUpperCase()]
        if (!rate) return false
        const discount = Math.round(get().subtotal() * rate)
        set({ couponCode: code.toUpperCase(), couponDiscount: discount })
        return true
      },

      removeCoupon: () =>
        set({ couponCode: undefined, couponDiscount: 0 }),

      clearCart: () =>
        set({ items: [], couponCode: undefined, couponDiscount: 0 }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: 'yalahaji-cart',
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
        couponDiscount: state.couponDiscount,
      }),
    }
  )
)
