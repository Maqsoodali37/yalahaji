import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import {
  login as apiLogin,
  register as apiRegister,
  fetchMe,
  logout as apiLogout,
  normalisePhone,
  isValidPakistaniPhone,
  getToken,
  mergeGuestCart,
  ApiError,
} from '@/lib/api'

interface AuthStore {
  user: User | null
  isLoading: boolean
  /** True until the persisted session has been checked against the server. */
  isHydrating: boolean
  error: string | null

  login: (identifier: string, password: string) => Promise<boolean>
  register: (name: string, phone: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
  /** Re-validate the persisted user against the API. Runs once on rehydrate. */
  hydrate: () => Promise<void>
  setUser: (user: User) => void
}

/**
 * The sign-in field accepts either a phone number or an email. Only normalise
 * when it looks like a phone — running a Pakistani-phone transform over
 * "ali@example.com" would mangle it into something that can never match.
 */
function toIdentifier(input: string): string {
  const trimmed = input.trim()
  if (trimmed.includes('@')) return trimmed
  return isValidPakistaniPhone(trimmed) ? normalisePhone(trimmed) : trimmed
}

function messageFor(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    // A dropped connection and a rejected password are different problems and
    // deserve different wording — "invalid credentials" on a network failure
    // sends people resetting a password that was never wrong.
    if (e.status === 0) return e.message
    if (e.status === 429) return 'Too many attempts. Please wait a minute and try again.'
    return e.message || fallback
  }
  return fallback
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      isHydrating: true,
      error: null,

      login: async (identifier, password) => {
        set({ isLoading: true, error: null })
        try {
          const user = await apiLogin(toIdentifier(identifier), password)
          set({ user, isLoading: false, error: null })

          // Fold anything added while browsing as a guest into the real cart.
          // A failure here must not fail the login — the shopper is signed in
          // either way, and a missed merge is recoverable.
          try {
            await mergeGuestCart()
          } catch {
            /* ignore */
          }

          return true
        } catch (e) {
          set({ isLoading: false, error: messageFor(e, 'Invalid phone number or password.') })
          return false
        }
      },

      register: async (name, phone, email, password) => {
        set({ isLoading: true, error: null })

        // Validate before the round trip so the customer gets a usable message
        // instead of the API's raw regex complaint.
        if (!isValidPakistaniPhone(phone)) {
          set({
            isLoading: false,
            error: 'Enter a valid Pakistani mobile number, e.g. 0300 1234567.',
          })
          return false
        }
        if (password.length < 8) {
          set({ isLoading: false, error: 'Password must be at least 8 characters.' })
          return false
        }

        try {
          const user = await apiRegister({
            name: name.trim(),
            phone: normalisePhone(phone),
            email: email.trim() || undefined,
            password,
          })
          set({ user, isLoading: false, error: null })

          try {
            await mergeGuestCart()
          } catch {
            /* ignore */
          }

          return true
        } catch (e) {
          set({
            isLoading: false,
            error: messageFor(e, 'Could not create your account. Please try again.'),
          })
          return false
        }
      },

      logout: () => {
        apiLogout()
        set({ user: null, error: null })
      },

      clearError: () => set({ error: null }),

      setUser: (user) => set({ user }),

      /**
       * The persisted user is only a cache for first paint; the token is the
       * actual credential. On every load we confirm it still works — a
       * deactivated account or an expired token must not keep rendering a
       * signed-in header indefinitely.
       */
      hydrate: async () => {
        if (!getToken()) {
          set({ user: null, isHydrating: false })
          return
        }
        try {
          const user = await fetchMe()
          set({ user, isHydrating: false })
        } catch (e) {
          if (e instanceof ApiError && e.isAuthError) {
            apiLogout()
            set({ user: null, isHydrating: false })
          } else {
            // Network blip: keep the cached user rather than signing someone
            // out because their connection dropped for a moment.
            set({ isHydrating: false })
          }
        }
      },
    }),
    {
      name: 'yalahaji-auth',
      partialize: (state) => ({ user: state.user }),
      // `isHydrating` is not persisted, so without this a restored store would
      // sit at its initial `true` forever and gate the UI on a check that
      // never ran.
      onRehydrateStorage: () => (state) => {
        state?.hydrate()
      },
    }
  )
)
