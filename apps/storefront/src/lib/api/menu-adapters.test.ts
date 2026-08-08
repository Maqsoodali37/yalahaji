import { describe, it, expect } from 'vitest'
import { adaptMenu, adaptMenuItem } from './adapters'
import type { WireMenuItem } from './wire'

function wire(over: Partial<WireMenuItem> & { id: string }): WireMenuItem {
  return {
    title: { en: 'Item', ur: null, ar: null },
    linkType: 'custom',
    targetSlug: null,
    url: '/x',
    icon: null,
    image: null,
    badge: null,
    order: 0,
    device: 'all',
    visibility: 'everyone',
    isMegaMenu: false,
    megaLayout: null,
    megaColumns: 4,
    megaConfig: null,
    relAttribute: null,
    noFollow: false,
    openInNewTab: false,
    titleAttr: null,
    children: [],
    ...over,
  }
}

describe('adaptMenuItem — href', () => {
  // Prevents: five nav components each deciding where a `collection` goes,
  // the way three of them once decided independently which variant a product
  // is priced at and disagreed.
  it('builds the route for each link type, locale prefix included', () => {
    const cases: Array<[string, Partial<WireMenuItem>, string]> = [
      ['category', { linkType: 'category', targetSlug: 'ihram', url: null }, '/en/shop/ihram'],
      ['product', { linkType: 'product', targetSlug: 'attar-oud', url: null }, '/en/products/attar-oud'],
      ['cms_page', { linkType: 'cms_page', targetSlug: 'about', url: null }, '/en/about'],
      ['brand', { linkType: 'brand', targetSlug: 'ajmal', url: null }, '/en/shop?brand=ajmal'],
      ['collection', { linkType: 'collection', targetSlug: 'eid', url: null }, '/en/shop?collection=eid'],
      ['custom', { linkType: 'custom', url: '/kit-builder' }, '/en/kit-builder'],
    ]

    for (const [name, over, expected] of cases) {
      const item = adaptMenuItem(wire({ id: name, ...over }), 'en')
      expect(item?.href, name).toBe(expected)
    }
  })

  it('leaves an external URL untouched and flags it', () => {
    const item = adaptMenuItem(
      wire({ id: 'x', linkType: 'external', url: 'https://example.com/guide' }),
      'ur',
    )
    expect(item?.href).toBe('https://example.com/guide')
    expect(item?.isExternal).toBe(true)
  })

  it('prefixes with the active locale', () => {
    const item = adaptMenuItem(wire({ id: 'x', linkType: 'category', targetSlug: 'ihram', url: null }), 'ar')
    expect(item?.href).toBe('/ar/shop/ihram')
  })

  // Prevents: an anchor to `/shop/undefined` in the header. A dead control is
  // worse than one link fewer.
  it('drops an item that cannot produce a destination', () => {
    expect(adaptMenuItem(wire({ id: 'x', linkType: 'category', targetSlug: null, url: null }), 'en')).toBeNull()
    expect(adaptMenuItem(wire({ id: 'x', linkType: 'custom', url: null }), 'en')).toBeNull()
    expect(adaptMenuItem(wire({ id: 'x', linkType: 'external', url: '/relative' }), 'en')).toBeNull()
  })

  // Prevents: an open redirect out of the navigation. The API validates this
  // on write; the adapter is the boundary components trust, so it re-checks.
  it('drops a protocol-relative path and a javascript: URL', () => {
    expect(adaptMenuItem(wire({ id: 'x', url: '//evil.example' }), 'en')).toBeNull()
    expect(adaptMenuItem(wire({ id: 'x', url: 'javascript:alert(1)' }), 'en')).toBeNull()
  })

  it('renders a heading as a label with children and drops an empty one', () => {
    const withChildren = adaptMenuItem(
      wire({
        id: 'h',
        linkType: 'heading',
        url: null,
        children: [wire({ id: 'c', url: '/terms' })],
      }),
      'en',
    )
    expect(withChildren?.href).toBeNull()
    expect(withChildren?.children).toHaveLength(1)

    expect(adaptMenuItem(wire({ id: 'h', linkType: 'heading', url: null }), 'en')).toBeNull()
  })

  // Prevents: a column heading surviving after every link under it was
  // filtered out or dropped — an empty title floating in the footer.
  it('drops a heading whose children all dropped', () => {
    const item = adaptMenuItem(
      wire({
        id: 'h',
        linkType: 'heading',
        url: null,
        children: [wire({ id: 'bad', linkType: 'category', targetSlug: null, url: null })],
      }),
      'en',
    )
    expect(item).toBeNull()
  })
})

describe('adaptMenuItem — SEO attributes', () => {
  // Prevents: `rel=""` on every anchor in the header. React omits the
  // attribute for `undefined` and emits it for an empty string.
  it('returns undefined rather than an empty rel', () => {
    expect(adaptMenuItem(wire({ id: 'x' }), 'en')?.rel).toBeUndefined()
  })

  it('emits nofollow when the flag is set', () => {
    expect(adaptMenuItem(wire({ id: 'x', noFollow: true }), 'en')?.rel).toBe('nofollow')
  })

  // Prevents: the opened page holding a live `window.opener` handle back into
  // this one and navigating it somewhere else.
  it('adds noopener and noreferrer to an external link opening in a new tab', () => {
    const rel = adaptMenuItem(
      wire({ id: 'x', linkType: 'external', url: 'https://example.com', openInNewTab: true }),
      'en',
    )?.rel
    expect(rel?.split(' ').sort()).toEqual(['noopener', 'noreferrer'])
  })

  it('merges extra rel tokens without duplicating them', () => {
    const rel = adaptMenuItem(
      wire({
        id: 'x',
        linkType: 'external',
        url: 'https://example.com',
        openInNewTab: true,
        noFollow: true,
        relAttribute: 'sponsored nofollow',
      }),
      'en',
    )?.rel
    expect(rel?.split(' ').sort()).toEqual(['nofollow', 'noopener', 'noreferrer', 'sponsored'])
  })

  // An internal link opening in a new tab is same-origin, so noopener buys
  // nothing and would suppress a legitimate referrer.
  it('does not add noopener to an internal link', () => {
    expect(adaptMenuItem(wire({ id: 'x', url: '/shop', openInNewTab: true }), 'en')?.rel).toBeUndefined()
  })
})

describe('adaptMenuItem — translations', () => {
  // Prevents: an empty heading in Urdu. next-intl returns the key path for a
  // miss, so `?? 'fallback'` would be dead code — the fallback has to happen
  // in the adapter.
  it('falls back to English for a missing translation', () => {
    const item = adaptMenuItem(
      wire({ id: 'x', title: { en: 'Ihram', ur: null, ar: 'الإحرام' } }),
      'en',
    )
    expect(item?.title).toEqual({ en: 'Ihram', ur: 'Ihram', ar: 'الإحرام' })
  })

  it('carries badge and title attribute per locale, or omits them', () => {
    const withBadge = adaptMenuItem(
      wire({ id: 'x', badge: { en: 'Sale', ur: 'سیل', ar: null } }),
      'en',
    )
    expect(withBadge?.badge).toEqual({ en: 'Sale', ur: 'سیل', ar: 'Sale' })
    expect(withBadge?.titleAttr).toBeUndefined()
  })
})

describe('adaptMenuItem — mega menus', () => {
  // Prevents: an empty white box hanging under the nav on hover.
  it('is not a mega menu when it has neither children nor config', () => {
    expect(adaptMenuItem(wire({ id: 'x', isMegaMenu: true }), 'en')?.isMegaMenu).toBe(false)
  })

  it('is a mega menu once it has children', () => {
    const item = adaptMenuItem(
      wire({ id: 'x', isMegaMenu: true, children: [wire({ id: 'c' })] }),
      'en',
    )
    expect(item?.isMegaMenu).toBe(true)
  })

  // Prevents: a layout value the storefront has no component for rendering as
  // a blank panel. Falling back to the default is a visible menu.
  it('ignores an unrecognised layout', () => {
    expect(adaptMenuItem(wire({ id: 'x', megaLayout: 'carousel' }), 'en')?.megaLayout).toBeUndefined()
  })

  it('defaults a zero column count rather than rendering zero columns', () => {
    expect(adaptMenuItem(wire({ id: 'x', megaColumns: 0 }), 'en')?.megaColumns).toBe(4)
  })
})

describe('adaptMenu', () => {
  it('drops unusable items from the top level', () => {
    const menu = adaptMenu(
      {
        id: 'm',
        location: 'header',
        name: 'Header',
        cacheTtl: 300,
        updatedAt: '2026-01-01T00:00:00.000Z',
        items: [
          wire({ id: 'good', url: '/shop' }),
          wire({ id: 'bad', linkType: 'category', targetSlug: null, url: null }),
        ],
      },
      'en',
    )
    expect(menu.items.map((i) => i.id)).toEqual(['good'])
  })
})
