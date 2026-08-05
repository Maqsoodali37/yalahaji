'use client'

import { create } from 'zustand'
import { api, clearToken, setToken, getToken, ApiError } from './api'
import type { AuthUser, LoginResponse, Role } from '@/types'

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
  user: AuthUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  error: string | null
  login: (identifier: string, password: string) => Promise<void>
  logout: () => void
  /** Restore session from a stored token on app boot. */
  hydrate: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  error: null,

  login: async (identifier, password) => {
    set({ status: 'loading', error: null })
    try {
      const res = await api.post<LoginResponse>(
        '/auth/login',
        { identifier, password },
        { anonymous: true },
      )

      // The login endpoint returns only a token; the profile comes from /auth/me.
      setToken(res.access_token)
      const user = await api.get<AuthUser>('/auth/me')

      if (!isStaff(user.role)) {
        clearToken()
        set({
          status: 'unauthenticated',
          user: null,
          error: 'This account does not have dashboard access.',
        })
        return
      }

      set({ user, status: 'authenticated', error: null })
    } catch (err) {
      clearToken()
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? 'Incorrect phone/email or password.'
            : err.message
          : 'Could not reach the server. Check your connection.'
      set({ status: 'unauthenticated', user: null, error: message })
    }
  },

  logout: () => {
    clearToken()
    set({ user: null, status: 'unauthenticated', error: null })
  },

  hydrate: async () => {
    if (!getToken()) {
      set({ status: 'unauthenticated', user: null })
      return
    }
    set({ status: 'loading' })
    try {
      const user = await api.get<AuthUser>('/auth/me')
      if (!isStaff(user.role)) {
        clearToken()
        set({ status: 'unauthenticated', user: null, error: 'Dashboard access revoked.' })
        return
      }
      set({ user, status: 'authenticated', error: null })
    } catch {
      clearToken()
      set({ status: 'unauthenticated', user: null })
    }
  },
}))
