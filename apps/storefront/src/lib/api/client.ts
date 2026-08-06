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
// `||`, not `??`: docker compose substitutes an unset variable with an empty
// string and still passes the build arg, so `NEXT_PUBLIC_API_URL=""` reaches
// the build. `??` would accept that empty string and every fetch would be
// made against a relative URL, which has no meaning on the server.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

/**
 * Server-side origin. Inside Docker the storefront container can reach the
 * API directly on the compose network, so a server render should not leave
 * the host and come back in through nginx and TLS. Falls back to the public
 * URL when unset, which is the correct behaviour outside Docker.
 */
export const INTERNAL_API_URL = process.env.INTERNAL_API_URL || API_URL

const isServer = typeof window === 'undefined'

/** Upper bound on a single API call. Callers may override with their own `signal`. */
const REQUEST_TIMEOUT_MS = 10_000

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
      // Without this an unreachable-but-routable API (a firewalled host, a
      // load balancer that accepts the SYN and never replies) hangs the
      // request until the platform kills it. A bounded wait turns that into
      // an ApiError, which apiFetchSafe degrades to its fallback.
      signal: rest.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

/**
 * For a read where the resource *is* the page — `/products/[slug]`,
 * `/shop/[category]`, `/blog/[slug]`.
 *
 * Returns `null` only when the resource is genuinely absent, and rethrows
 * everything else so the route's `error.tsx` handles it.
 *
 * `apiFetchSafe` is wrong here: it collapses "this product does not exist"
 * and "the API is unreachable" into the same `null`, so during an outage
 * every bookmarked product page tells the customer their product is gone —
 * with a 404 status that invites search engines to drop the URL. A missing
 * resource is a 404; a broken backend is an error boundary.
 *
 * Absent also covers a 200 carrying `null` or `{}`. The API has returned an
 * empty body for a missing row before, and a bare truthiness check hands `{}`
 * straight to an adapter, which reads a field off `undefined` — that is a
 * runtime crash on the server render, which is what the browser reports as
 * "Application error: a client-side exception has occurred".
 */
export async function apiFetchResource<T extends { id?: unknown }>(
  path: string,
  options: RequestOptions = {},
): Promise<T | null> {
  let payload: T | null
  try {
    payload = await apiFetch<T | null>(path, options)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }

  if (!payload || typeof payload !== 'object' || payload.id === undefined) return null
  return payload
}
