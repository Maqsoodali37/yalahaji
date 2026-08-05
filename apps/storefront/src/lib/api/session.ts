// Guest cart session id.
//
// The API signs these, so the storefront cannot mint its own — it has to ask
// for one via POST /cart/session and then keep sending it. An unsigned or
// invented value is rejected with 401, which is what stops one shopper from
// reading another's guest cart.

import { apiFetch } from './client'

const SESSION_KEY = 'yalahaji-session'

export function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function storeSessionId(id: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SESSION_KEY, id)
  } catch {
    /* ignore — the cart falls back to being per-request */
  }
}

export function clearSessionId() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

// Concurrent callers (cart drawer + product page mounting together) must not
// each mint a session and race to overwrite the other's — that would strand
// whichever cart lost. They share one in-flight request instead.
let inFlight: Promise<string> | null = null

/** Return the stored guest session id, requesting one from the API if needed. */
export async function ensureSessionId(): Promise<string> {
  const existing = getStoredSessionId()
  if (existing) return existing

  if (!inFlight) {
    inFlight = apiFetch<{ sessionId: string }>('/cart/session', {
      method: 'POST',
      anonymous: true,
    })
      .then(({ sessionId }) => {
        storeSessionId(sessionId)
        return sessionId
      })
      .finally(() => {
        inFlight = null
      })
  }

  return inFlight
}
