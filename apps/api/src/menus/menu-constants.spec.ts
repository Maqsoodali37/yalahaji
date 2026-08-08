import { INTERNAL_PATH_REGEX, MAX_MENU_URL, MAX_MENU_DEPTH } from './menu-constants'

/**
 * The API half of the mirror pinned in
 * `apps/storefront/src/lib/menu-constants.test.ts`.
 *
 * Both halves pin the same literal, so editing **either** side alone fails a
 * build. Pinning only the storefront copy left the more dangerous direction
 * unguarded: an API rule loosened on its own writes rows the adapter then
 * silently drops, and an API rule tightened on its own rejects paths staff were
 * never warned about.
 */
describe('menu-constants mirror the storefront', () => {
  it('holds the same regex source as apps/storefront/src/lib/menu-constants.ts', () => {
    expect(INTERNAL_PATH_REGEX.source).toBe('^\\/(?![/\\\\])[^\\s]*$')
  })

  it('holds the same numeric caps', () => {
    expect(MAX_MENU_URL).toBe(2048)
    expect(MAX_MENU_DEPTH).toBe(10)
  })
})

describe('INTERNAL_PATH_REGEX', () => {
  it('accepts ordinary internal paths', () => {
    for (const path of ['/', '/shop', '/kit-builder', '/shop?filter=sale', '/shop/ihram#top']) {
      expect(INTERNAL_PATH_REGEX.test(path)).toBe(true)
    }
  })

  // Every one of these resolves off-origin in a browser, or is not a path.
  // `/\evil.example` is the non-obvious one: URL parsing for a special scheme
  // normalises `\` to `/`, so it resolves exactly as `//evil.example` does.
  it('rejects anything that leaves the site', () => {
    for (const path of [
      '//evil.example',
      '/\\evil.example',
      '/\\\\evil.example',
      'https://evil.example',
      'javascript:alert(1)',
      'shop',
      '',
    ]) {
      expect(INTERNAL_PATH_REGEX.test(path)).toBe(false)
    }
  })

  it('rejects a path containing whitespace', () => {
    expect(INTERNAL_PATH_REGEX.test('/a b')).toBe(false)
    expect(INTERNAL_PATH_REGEX.test('/a\tb')).toBe(false)
  })
})
