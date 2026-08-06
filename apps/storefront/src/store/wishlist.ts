import { create } from 'zustand'
import { fetchWishlistIds, addToWishlist, removeFromWishlist } from '@/lib/api'

/**
 * The wishlist is server-side and requires a signed-in customer.
 *
 * It used to be a `persist`ed Zustand store backed by `localStorage`, while a
 * complete set of API endpoints (`/users/me/wishlist`) sat unused. The two
 * disagreed about what a wishlist even is, and the local version lost a
 * customer's saved items when they changed device or cleared their browser —
 * silently, which is the worst way to lose something someone chose to keep.
 *
 * `LEGACY_KEY` is what remains of that: ids already on a device are pushed to
 * the account the first time its owner signs in, so nobody loses a list in the
 * changeover. Nothing writes to it any more.
 */
const LEGACY_KEY = 'yalahaji-wishlist'

interface WishlistStore {
  ids: Set<string>
  /** True while the server list is being read or written. */
  isLoading: boolean
  /** True once the server list has been loaded at least once this session. */
  isSynced: boolean

  isInWishlist: (productId: string) => boolean
  count: () => number

  /** Load the signed-in customer's list. Safe to call repeatedly. */
  sync: () => Promise<void>
  /**
   * Add or remove. The caller is responsible for having a session — see
   * `useWishlistToggle`, which sends guests to sign in instead.
   */
  toggle: (productId: string) => Promise<void>
  /** Push ids saved on this device before the account existed, then sync. */
  adoptLocalIds: () => Promise<void>
  /** Drop the in-memory list on sign-out so the next customer starts clean. */
  clear: () => void
}

/** Ids saved by the old local-only wishlist, if this device has any. */
function readLegacyIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const ids = parsed?.state?.ids
    return Array.isArray(ids) ? ids.filter((v): v is string => typeof v === 'string') : []
  } catch {
    // Malformed leftovers are not worth failing a sign-in over.
    return []
  }
}

function clearLegacyIds() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* Safari private mode */
  }
}

export const useWishlistStore = create<WishlistStore>()((set, get) => ({
  ids: new Set(),
  isLoading: false,
  isSynced: false,

  isInWishlist: (productId) => get().ids.has(productId),
  count: () => get().ids.size,

  sync: async () => {
    set({ isLoading: true })
    try {
      const ids = await fetchWishlistIds()
      set({ ids: new Set(ids), isSynced: true, isLoading: false })
    } catch {
      // A failed read must not empty the list on screen — that reads as "your
      // saved items are gone". Leave what is there and let the wishlist page
      // surface the failure.
      set({ isLoading: false })
    }
  },

  toggle: async (productId) => {
    const has = get().ids.has(productId)

    // Optimistic: a heart that waits for a round trip before filling feels
    // broken on a slow connection, and this is a cheap action to undo.
    set((state) => {
      const next = new Set(state.ids)
      if (has) next.delete(productId)
      else next.add(productId)
      return { ids: next }
    })

    try {
      if (has) await removeFromWishlist(productId)
      else await addToWishlist(productId)
    } catch {
      // Put it back. Leaving the optimistic state would tell the customer
      // something is saved when the server never accepted it.
      set((state) => {
        const next = new Set(state.ids)
        if (has) next.add(productId)
        else next.delete(productId)
        return { ids: next }
      })
    }
  },

  adoptLocalIds: async () => {
    const legacy = readLegacyIds()

    if (legacy.length > 0) {
      // Sequential rather than parallel: this runs during sign-in, and a burst
      // of writes is a poor first request from a new session. The list is
      // small by nature.
      for (const id of legacy) {
        try {
          await addToWishlist(id)
        } catch {
          // A product that has since been delisted will 404. Skipping it is
          // right — the rest of the list should still arrive.
        }
      }
      clearLegacyIds()
    }

    await get().sync()
  },

  clear: () => set({ ids: new Set(), isSynced: false }),
}))
