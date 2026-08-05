'use client'

import { create } from 'zustand'
import { api, ApiError } from './api'
import type { AdminProfile, Role } from '@/types'

/** Roles permitted to sign in to the admin dashboard at all. */
export const STAFF_ROLES: Role[] = ['admin', 'manager', 'support', 'fulfillment']

/** Roles allowed to create/edit catalogue, content and pricing. */
export const MANAGE_ROLES: Role[] = ['admin', 'manager']

export function isStaff(role?: Role | null): boolean {
  return !!role && STAFF_ROLES.includes(role)
}

export function canManage(role?: Role | null): boolean {
  return !!role && MANAGE_ROLES.includes(role)
}

interface AuthState {
  user: AdminProfile | null
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  error: string | null
  login: (identifier: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Restore the session from the httpOnly cookie on app boot. */
  hydrate: () => Promise<void>
}

/**
 * The session lives entirely in an httpOnly cookie, so there is nothing to
 * persist here — on reload we simply ask the API who we are.
 */
export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  error: null,

  login: async (identifier, password) => {
    set({ status: 'loading', error: null })
    try {
      const { user } = await api.post<{ user: AdminProfile }>('/auth/admin/login', {
        identifier,
        password,
      })
      set({ user, status: 'authenticated', error: null })
    } catch (err) {
      let message = 'Could not reach the server. Check your connection.'

      if (err instanceof ApiError) {
        if (err.status === 401) {
          // The API returns a deliberately uniform message so we can't leak
          // whether the account exists or is staff.
          message = 'Incorrect phone/email or password.'
        } else if (err.isThrottled) {
          message = 'Too many attempts. Wait a minute and try again.'
        } else {
          message = err.message
        }
      }

      set({ status: 'unauthenticated', user: null, error: message })
    }
  },

  logout: async () => {
    // Clearing the cookie is the server's job.
    await api.post('/auth/admin/logout').catch(() => undefined)
    set({ user: null, status: 'unauthenticated', error: null })
  },

  hydrate: async () => {
    set({ status: 'loading' })
    try {
      const user = await api.get<AdminProfile>('/auth/admin/me')
      set({ user, status: 'authenticated', error: null })
    } catch {
      set({ status: 'unauthenticated', user: null })
    }
  },
}))
