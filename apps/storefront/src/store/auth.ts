import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

// Mock user — replace with real API call when backend is ready
const MOCK_USER: User = {
  id: 'user-001',
  name: 'Muhammad Ali',
  email: 'ali@example.com',
  phone: '+92 300 1234567',
  addresses: [
    {
      id: 'addr-001',
      label: 'Home',
      fullName: 'Muhammad Ali',
      phone: '+92 300 1234567',
      addressLine1: 'House 42, Street 5, DHA Phase 3',
      city: 'Lahore',
      province: 'Punjab',
      postalCode: '54000',
      isDefault: true,
    },
  ],
  wishlistIds: [],
  loyaltyPoints: 120,
  createdAt: '2024-01-01T00:00:00Z',
}

// Mock credentials — any phone + password works in dev; replace with real auth
const MOCK_CREDENTIALS = {
  phone: '+92 300 1234567',
  password: 'password123',
}

interface AuthStore {
  user: User | null
  isLoading: boolean
  error: string | null

  login: (phone: string, password: string) => Promise<boolean>
  register: (name: string, phone: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (phone, password) => {
        set({ isLoading: true, error: null })
        // Simulate network delay
        await new Promise((r) => setTimeout(r, 800))

        // Accept any non-empty credentials in dev
        if (phone.trim() && password.trim()) {
          const user = { ...MOCK_USER, phone: phone.trim() }
          set({ user, isLoading: false, error: null })
          return true
        }

        set({ isLoading: false, error: 'Invalid phone number or password.' })
        return false
      },

      register: async (name, phone, email, password) => {
        set({ isLoading: true, error: null })
        await new Promise((r) => setTimeout(r, 800))

        if (name.trim() && phone.trim() && password.trim()) {
          const user: User = {
            ...MOCK_USER,
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || MOCK_USER.email,
            loyaltyPoints: 0,
          }
          set({ user, isLoading: false, error: null })
          return true
        }

        set({ isLoading: false, error: 'Please fill in all required fields.' })
        return false
      },

      logout: () => set({ user: null, error: null }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'yalahaji-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
