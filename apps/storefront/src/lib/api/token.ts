// Customer bearer token storage.
//
// localStorage rather than a cookie: the API's customer strategy reads the
// Authorization header, and the storefront is a separate origin from the API
// in production. The admin panel makes the opposite choice (httpOnly cookie)
// because a staff session is worth far more to an attacker.

const TOKEN_KEY = 'yalahaji-token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    // Safari private mode throws on localStorage access.
    return null
  }
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* non-fatal: the session simply won't survive a reload */
  }
}

export function clearToken() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}
