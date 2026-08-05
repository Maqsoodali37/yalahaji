// ─────────────────────────────────────────────────────────────
// Typed fetch client for the Yala Haji admin API.
//
// Authentication is an httpOnly cookie set by POST /auth/admin/login.
// There is deliberately NO token handling in this file: the browser
// attaches the cookie, and JavaScript cannot read it — so an XSS bug
// on the dashboard cannot exfiltrate a session.
// ─────────────────────────────────────────────────────────────

export const API_URL =
  process.env.NEXT_PUBLIC_ADMIN_API_URL ?? 'http://localhost:4000/api/v1'

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

  get isForbidden() {
    return this.status === 403
  }

  /** Rate limited or temporarily locked out. */
  get isThrottled() {
    return this.status === 429
  }
}

type QueryValue = string | number | boolean | undefined | null

export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const str = search.toString()
  return str ? `?${str}` : ''
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
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

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    // Sends and receives the admin session cookie. Requires the API to
    // allowlist this origin with `credentials: true`.
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!res.ok) {
    throw new ApiError(
      extractMessage(payload, res.statusText || 'Request failed'),
      res.status,
      payload,
    )
  }

  return payload as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PUT', body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
}

/** Multipart upload — Content-Type is set by the browser, not by us. */
export async function uploadFile(
  file: File,
  folder = 'products',
): Promise<{ url: string }> {
  const form = new FormData()
  form.append('folder', folder)
  form.append('file', file)

  const res = await fetch(`${API_URL}/media/upload`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })

  const text = await res.text()
  const payload = text ? JSON.parse(text) : null

  if (!res.ok) {
    throw new ApiError(extractMessage(payload, 'Upload failed'), res.status, payload)
  }
  return payload as { url: string }
}
