import { describe, it, expect } from 'vitest'
import { routeOf, matchesRoute, isItemActive } from './active-route'
import type { MenuItem } from '@/types'

function node(over: Partial<MenuItem> & { id: string }): MenuItem {
  return {
    title: { en: 'Item', ur: 'Item', ar: 'Item' },
    linkType: 'custom',
    href: null,
    isExternal: false,
    device: 'all',
    openInNewTab: false,
    isMegaMenu: false,
    megaColumns: 4,
    children: [],
    ...over,
  }
}

describe('routeOf', () => {
  it('strips the query string and hash', () => {
    expect(routeOf('/en/shop?filter=sale')).toBe('/en/shop')
    expect(routeOf('/en/about#contact')).toBe('/en/about')
  })

  it('normalises a trailing slash', () => {
    expect(routeOf('/en/shop/')).toBe('/en/shop')
    expect(routeOf('/')).toBe('/')
  })
})

describe('matchesRoute', () => {
  it('matches the exact route', () => {
    expect(matchesRoute('/en/shop/ihram', '/en/shop/ihram')).toBe(true)
  })

  // Prevents: a parent looking unvisited while the customer is standing on
  // one of its child pages.
  it('matches an ancestor of the current route', () => {
    expect(matchesRoute('/en/shop/ihram/premium', '/en/shop/ihram')).toBe(true)
  })

  // Prevents: "Home" being permanently highlighted. `/en` is a prefix of every
  // route in the app, so an active state that included it would mean nothing.
  it('does not treat the locale root as an ancestor', () => {
    expect(matchesRoute('/en/shop/ihram', '/en')).toBe(false)
    expect(matchesRoute('/ar/shop', '/ar')).toBe(false)
  })

  // Prevents: "Ihram" highlighting on `/en/shop/ihram-belts`, a different
  // category that merely starts with the same characters.
  it('does not match a sibling route sharing a prefix', () => {
    expect(matchesRoute('/en/shop/ihram-belts', '/en/shop/ihram')).toBe(false)
  })

  it('ignores the query string on either side', () => {
    expect(matchesRoute('/en/shop', '/en/shop?filter=sale')).toBe(true)
  })
})

describe('isItemActive', () => {
  it('is active when a nested descendant matches', () => {
    const tree = node({
      id: 'top',
      children: [node({ id: 'mid', children: [node({ id: 'leaf', href: '/en/shop/ihram' })] })],
    })
    expect(isItemActive(tree, '/en/shop/ihram')).toBe(true)
  })

  // A heading has no href of its own — it is active only through its children.
  it('is inactive when nothing in the branch matches', () => {
    const tree = node({ id: 'top', children: [node({ id: 'leaf', href: '/en/blog' })] })
    expect(isItemActive(tree, '/en/shop/ihram')).toBe(false)
  })
})
