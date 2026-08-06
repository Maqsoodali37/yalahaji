import { describe, it, expect } from 'vitest'
import { safeNextPath } from './auth-redirect'

/**
 * `next` arrives from the query string, so anyone who can get a customer to
 * click a link controls it. Each test here names the redirect it prevents.
 */
describe('safeNextPath', () => {
  const locale = 'en'
  const fallback = '/en/account'

  it('returns the requested path when it is a path on this site', () => {
    expect(safeNextPath('/en/account/returns', locale)).toBe('/en/account/returns')
    expect(safeNextPath('/en/account/orders?page=2', locale)).toBe('/en/account/orders?page=2')
  })

  it('falls back when there is nothing to honour', () => {
    expect(safeNextPath(null, locale)).toBe(fallback)
    expect(safeNextPath(undefined, locale)).toBe(fallback)
    expect(safeNextPath('', locale)).toBe(fallback)
    expect(safeNextPath('   ', locale)).toBe(fallback)
  })

  it('rejects an absolute URL to another origin', () => {
    // Otherwise a WhatsApp link lands the customer on a convincing fake
    // sign-in page one hop after a real one.
    expect(safeNextPath('https://evil.example/login', locale)).toBe(fallback)
    expect(safeNextPath('http://evil.example', locale)).toBe(fallback)
  })

  it('rejects a protocol-relative URL', () => {
    // Browsers read `//evil.example` as a full URL, not a path — this is the
    // one that looks safe because it starts with a slash.
    expect(safeNextPath('//evil.example/login', locale)).toBe(fallback)
    expect(safeNextPath('/\\evil.example/login', locale)).toBe(fallback)
    expect(safeNextPath('/\/evil.example', locale)).toBe(fallback)
  })

  it('rejects a percent-encoded protocol-relative URL', () => {
    // `useSearchParams` decodes once; a hand-written link can be encoded
    // twice, so the check has to see through one more layer.
    expect(safeNextPath('%2F%2Fevil.example', locale)).toBe(fallback)
  })

  it('rejects a javascript: payload', () => {
    expect(safeNextPath('javascript:alert(1)', locale)).toBe(fallback)
    expect(safeNextPath('JaVaScRiPt:alert(1)', locale)).toBe(fallback)
    expect(safeNextPath('data:text/html,<script>', locale)).toBe(fallback)
  })

  it('rejects a bare path with no leading slash', () => {
    // `evil.example` is resolved relative to the current directory by some
    // routers and as a host by others. Neither is what the customer asked for.
    expect(safeNextPath('evil.example', locale)).toBe(fallback)
  })

  it('survives a malformed percent-encoding rather than throwing', () => {
    // decodeURIComponent throws on a lone `%`. A crash here would break the
    // sign-in form itself.
    expect(safeNextPath('%', locale)).toBe(fallback)
    expect(safeNextPath('/en/account/%E0%A4%A', locale)).toBe(fallback)
  })
})
