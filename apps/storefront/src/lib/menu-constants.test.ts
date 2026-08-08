import { describe, it, expect } from 'vitest'
import { INTERNAL_PATH_REGEX, MAX_MENU_URL, MAX_MENU_DEPTH } from './menu-constants'

/**
 * These pin the storefront half of the API mirror. If someone changes the API
 * copy without changing this one, these fail — which is the whole point of
 * writing the rule down twice.
 */
describe('menu-constants mirror the API', () => {
  it('holds the same regex source as apps/api/src/menus/menu-constants.ts', () => {
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
      expect(INTERNAL_PATH_REGEX.test(path), path).toBe(true)
    }
  })

  // Every one of these resolves off-site, or is not a path at all.
  it('rejects anything that leaves the site', () => {
    for (const path of [
      '//evil.example',
      '/\\evil.example',
      'https://evil.example',
      'javascript:alert(1)',
      'shop',
      '',
    ]) {
      expect(INTERNAL_PATH_REGEX.test(path), path).toBe(false)
    }
  })

  // Whitespace in a href is either a typo or an attempt to smuggle something
  // past a naive check; the browser percent-encodes it either way.
  it('rejects a path containing whitespace', () => {
    expect(INTERNAL_PATH_REGEX.test('/a b')).toBe(false)
    expect(INTERNAL_PATH_REGEX.test('/a\tb')).toBe(false)
  })
})
