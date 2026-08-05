// ─────────────────────────────────────────────────────────────
// Typed fetch client for the Yala Haji storefront API.
//
// Customer auth is a bearer token (the admin panel uses an httpOnly
// cookie instead — the two trust domains deliberately do not share a
// transport, a secret, or a login endpoint).
//
// Guest carts additionally carry X-Session-Id. That value must be one
// the API issued via POST /cart/session: unsigned ids are rejected, so
// a caller cannot invent one and read someone else's cart.
// ─────────────────────────────────────────────────────────────

import { getToken } from './token'
import { getStoredSessionId } from './session'

/**
 * Browser-visible API origin. Inlined at build time, so docker-compose
 * passes it as a build arg rather than only as an environment variable.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

/**
 * Server-side origin. Inside Docker the storefront container can reach the
 * API directly on the compose network, so a server render should not leave
 * the host and come back in through nginx and TLS. Falls back to the public
 * URL when unset, which is the correct behaviour outside Docker.
 */
export const INTERNAL_API_URL = process.env.INTERNAL_API_URL || API_URL

const isServer = typeof window === 'undefined'

export function apiBase() {
  return isServer ? INTERNAL_API_URL : API_URL
}

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }

  get isAuthError() {
    return this.status === 401
  }

  get isNotFound() {
    return this.status === 404
  }

  get isThrottled() {
    return this.status === 429
  }
}

type QueryValue = string | number | boolean | undefined | null | string[] | number[]

/**
 * Repeats a key for array values (`?tier=Economy&tier=Premium`), which is what
 * the API's ProductQueryDto expects for its multi-select filters.
 */
export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue

    if (Array.isArray(value)) {
      for (const v of value) {
        if (v === undefined || v === null || v === '') continue
        search.append(key, String(v))
      }
      continue
    }

    search.set(key, String(value))
  }

  const str = search.toString()
  return str ? `?${str}` : ''
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** Explicit bearer token. Required on the server, where localStorage does not exist. */
  token?: string | null
  /** Explicit guest session id, for the same reason. */
  sessionId?: string | null
  /** Skip auth/session headers entirely (public reads). */
  anonymous?: boolean
  /** Next.js fetch cache options — server components only. */
  next?: { revalidate?: number | false; tags?: string[] }
}

/** Nest returns `message` as string | string[]; flatten it. */
function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const msg = (payload as { message: unknown }).message
    if (Array.isArray(msg)) return msg.join(', ')
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, token, sessionId, anonymous, next, ...rest } = options

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  }

  if (!anonymous) {
    // On the server there is no localStorage, so callers pass credentials
    // explicitly; on the browser we read them from storage.
    const bearer = token !== undefined ? token : isServer ? null : getToken()
    if (bearer) finalHeaders.Authorization = `Bearer ${bearer}`

    const session = sessionId !== undefined ? sessionId : isServer ? null : getStoredSessionId()
    if (session) finalHeaders['X-Session-Id'] = session
  }

  let res: Response
  try {
    res = await fetch(`${apiBase()}${path}`, {
      ...rest,
      headers: finalHeaders,
      ...(next ? { next } : {}),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch (cause) {
    // A DNS failure or refused connection surfaces as a TypeError with no
    // status. Normalising it to ApiError means callers only handle one type.
    throw new ApiError(
      'Could not reach the server. Please check your connection and try again.',
      0,
      cause,
    )
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let payload: unknown = undefined
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!res.ok) {
    throw new ApiError(
      extractMessage(payload, `Request failed with status ${res.status}`),
      res.status,
      payload,
    )
  }

  return payload as T
}

/**
 * For public reads that should not fail a page render. Returns `fallback`
 * when the API is unreachable or 404s, so a dead backend degrades to an
 * empty section instead of a 500 on a page a customer is trying to buy from.
 */
export async function apiFetchSafe<T>(
  path: string,
  fallback: T,
  options: RequestOptions = {},
): Promise<T> {
  try {
    return await apiFetch<T>(path, options)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[api] ${path} failed, using fallback:`, (e as Error).message)
    }
    return fallback
  }
}
