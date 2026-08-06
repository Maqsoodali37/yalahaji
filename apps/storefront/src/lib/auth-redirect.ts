/**
 * Where to send someone after they sign in or register.
 *
 * `RequireAuth` puts the page they were trying to reach in `?next=`, so a
 * customer bounced off `/account/returns` lands back on returns rather than
 * on the order list.
 *
 * **`next` is attacker-controlled** — it is read straight off the query string,
 * and a link with `?next=https://evil.example/login` is trivial to send by
 * WhatsApp. A bare `router.push(next)` would then hand the customer a
 * convincing fake sign-in page one hop after a real one. So the value is only
 * honoured when it is a path on this site:
 *
 * - must start with a single `/`
 * - `//host` and `/\host` are rejected — browsers read both as protocol-
 *   relative URLs pointing somewhere else entirely
 * - anything with a scheme is rejected
 *
 * Anything that fails falls back to the account root, which is where the
 * customer would have gone anyway.
 */
export function safeNextPath(next: string | null | undefined, locale: string): string {
  const fallback = `/${locale}/account`
  if (!next) return fallback

  let value = next.trim()
  if (value === '') return fallback

  // A `next` built by `encodeURIComponent` arrives already decoded by
  // `useSearchParams`, but a hand-written link may still be encoded. Decoding
  // once more means `%2F%2Fevil.example` is judged as `//evil.example` rather
  // than slipping past the checks below as an opaque string.
  try {
    value = decodeURIComponent(value)
  } catch {
    return fallback
  }

  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  // Backslashes are normalised to forward slashes by some browsers, so
  // `/\evil.example` has to be treated as protocol-relative too.
  if (/^\/[\\/]/.test(value)) return fallback
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return fallback

  return value
}
