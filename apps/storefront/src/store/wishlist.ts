import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistStore {
  ids: Set<string>
  isInWishlist: (productId: string) => boolean
  toggle: (productId: string) => void
  add: (productId: string) => void
  remove: (productId: string) => void
  count: () => number
  clear: () => void
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      ids: new Set(),

      isInWishlist: (productId) => get().ids.has(productId),

      toggle: (productId) =>
        set((state) => {
          const next = new Set(state.ids)
          next.has(productId) ? next.delete(productId) : next.add(productId)
          return { ids: next }
        }),

      add: (productId) =>
        set((state) => ({ ids: new Set([...state.ids, productId]) })),

      remove: (productId) =>
        set((state) => {
          const next = new Set(state.ids)
          next.delete(productId)
          return { ids: next }
        }),

      count: () => get().ids.size,

      clear: () => set({ ids: new Set() }),
    }),
    {
      name: 'yalahaji-wishlist',
      storage: {
        getItem: (key) => {
          const val = localStorage.getItem(key)
          if (!val) return null
          const parsed = JSON.parse(val)
          return {
            ...parsed,
            state: {
              ...parsed.state,
              ids: new Set(parsed.state.ids ?? []),
            },
          }
        },
        setItem: (key, val) => {
          const serialised = {
            ...val,
            state: {
              ...val.state,
              ids: [...val.state.ids],
            },
          }
          localStorage.setItem(key, JSON.stringify(serialised))
        },
        removeItem: (key) => localStorage.removeItem(key),
      },
    }
  )
)
