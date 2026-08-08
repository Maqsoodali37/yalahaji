import { apiFetch } from './client'
import { setToken, clearToken, getToken } from './token'
import { adaptUser, adaptAddress } from './adapters'
import type { WireUser, WireAddress } from './wire'
import type { User, Address } from '@/types'

interface TokenResponse {
  access_token: string
  token_type: string
}

/**
 * `POST /auth/login` and `/auth/register` return only a token — no user body —
 * so both flows follow up with `GET /auth/me`. Doing it here rather than in
 * the store keeps callers from ever holding a token with no user attached.
 */
async function completeAuth(res: TokenResponse): Promise<User> {
  setToken(res.access_token)
  try {
    return await fetchMe()
  } catch (e) {
    // Don't leave a token behind for a session we couldn't establish.
    clearToken()
    throw e
  }
}

export async function login(identifier: string, password: string): Promise<User> {
  const res = await apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: { identifier, password },
    anonymous: true,
  })
  return completeAuth(res)
}

export async function register(input: {
  name: string
  phone: string
  email?: string
  password: string
}): Promise<User> {
  const res = await apiFetch<TokenResponse>('/auth/register', {
    method: 'POST',
    // The API rejects an empty-string email as invalid, so omit it entirely
    // when the optional field is blank.
    body: {
      name: input.name,
      phone: input.phone,
      password: input.password,
      ...(input.email?.trim() ? { email: input.email.trim() } : {}),
    },
    anonymous: true,
  })
  return completeAuth(res)
}

/** Current user, including addresses. Wishlist is fetched separately. */
export async function fetchMe(): Promise<User> {
  const wire = await apiFetch<WireUser>('/auth/me')
  return adaptUser(wire)
}

export function logout() {
  clearToken()
}

export function isAuthenticated() {
  return getToken() !== null
}

/**
 * Pakistani numbers only, matching the API's `^\+92[0-9]{10}$`. Normalising
 * here means `0300 1234567` and `92-300-1234567` both register, instead of
 * bouncing off a server-side regex the customer can't see.
 */
export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.startsWith('92')) return `+${digits}`
  if (digits.startsWith('0')) return `+92${digits.slice(1)}`
  if (digits.length === 10) return `+92${digits}`
  return input.trim()
}

export function isValidPakistaniPhone(input: string): boolean {
  return /^\+92[0-9]{10}$/.test(normalisePhone(input))
}

// ─── Addresses ────────────────────────────────────────────────────────────────

export async function fetchAddresses(): Promise<Address[]> {
  const wire = await apiFetch<WireAddress[]>('/users/me/addresses')
  return wire.map(adaptAddress)
}

/**
 * `email`/`addressLine2`/`area`/`postalCode` are widened to accept `null`
 * on top of `Address`'s `string | undefined`.
 *
 * `updateAddress` PATCHes, and the API distinguishes an omitted key ("leave
 * alone") from an explicit `null` ("clear it") — the same rule already
 * documented for `MenuItemInput`. `AddressForm` sends `null` for a field the
 * customer emptied; sending `undefined` instead would have been dropped by
 * `JSON.stringify` before the request ever left the browser, so the field
 * would never actually clear — the API would just leave the old value alone
 * and the customer would see it reappear on the next fetch.
 */
export type AddressInput = Omit<
  Address,
  'id' | 'email' | 'addressLine2' | 'area' | 'postalCode'
> & {
  email?: string | null
  addressLine2?: string | null
  area?: string | null
  postalCode?: string | null
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const wire = await apiFetch<WireAddress>('/users/me/addresses', {
    method: 'POST',
    body: input,
  })
  return adaptAddress(wire)
}

export async function updateAddress(id: string, input: Partial<AddressInput>): Promise<Address> {
  const wire = await apiFetch<WireAddress>(`/users/me/addresses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  })
  return adaptAddress(wire)
}

export async function deleteAddress(id: string): Promise<void> {
  await apiFetch(`/users/me/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function updateProfile(input: { name?: string; email?: string }): Promise<User> {
  const wire = await apiFetch<WireUser>('/users/me', { method: 'PATCH', body: input })
  return adaptUser(wire)
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export async function fetchWishlistIds(): Promise<string[]> {
  const rows = await apiFetch<Array<{ productId: string }>>('/users/me/wishlist')
  return rows.map((r) => r.productId)
}

export async function addToWishlist(productId: string) {
  return apiFetch(`/users/me/wishlist/${encodeURIComponent(productId)}`, { method: 'POST' })
}

export async function removeFromWishlist(productId: string) {
  return apiFetch(`/users/me/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' })
}
