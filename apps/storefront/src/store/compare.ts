import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_COMPARE = 4

interface CompareStore {
  ids: string[]
  isInCompare: (productId: string) => boolean
  toggle: (productId: string) => void
  remove: (productId: string) => void
  clear: () => void
  count: () => number
  isFull: () => boolean
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      ids: [],

      isInCompare: (productId) => get().ids.includes(productId),

      toggle: (productId) =>
        set((state) => {
          if (state.ids.includes(productId)) {
            return { ids: state.ids.filter((id) => id !== productId) }
          }
          if (state.ids.length >= MAX_COMPARE) return state
          return { ids: [...state.ids, productId] }
        }),

      remove: (productId) =>
        set((state) => ({ ids: state.ids.filter((id) => id !== productId) })),

      clear: () => set({ ids: [] }),

      count: () => get().ids.length,

      isFull: () => get().ids.length >= MAX_COMPARE,
    }),
    { name: 'yalahaji-compare' }
  )
)
