import { normaliseMedia } from './products.service'

/**
 * The media list arrives from a client. These tests pin the invariant the rest
 * of the system reads back: exactly one primary, and `order` matching position.
 *
 * Two queries filter on `isPrimary: true` and `take: 1` — the cart's product
 * select and the kit contents select — so a product that breaks this shows the
 * customer a blank placeholder rather than the photo staff uploaded.
 */
describe('normaliseMedia', () => {
  it('promotes the first image when the client flags none', () => {
    // Prevents: a product saved without ticking "primary" contributing no
    // image to the cart or to any kit that contains it.
    const result = normaliseMedia([
      { url: 'a.webp' },
      { url: 'b.webp' },
    ])

    expect(result.map((m) => m.isPrimary)).toEqual([true, false])
  })

  it('keeps only the first flagged image when the client flags several', () => {
    // Prevents: two rows claiming primary, which leaves `take: 1` returning
    // whichever the database felt like and the storefront sorting arbitrarily.
    const result = normaliseMedia([
      { url: 'a.webp' },
      { url: 'b.webp', isPrimary: true },
      { url: 'c.webp', isPrimary: true },
    ])

    expect(result.map((m) => m.isPrimary)).toEqual([false, true, false])
  })

  it('respects a primary that is not first in the list', () => {
    // Staff can promote any photo without having to reorder the gallery.
    const result = normaliseMedia([
      { url: 'a.webp' },
      { url: 'b.webp' },
      { url: 'c.webp', isPrimary: true },
    ])

    expect(result[2].isPrimary).toBe(true)
    expect(result.filter((m) => m.isPrimary)).toHaveLength(1)
  })

  it('renumbers order from the array position, ignoring what was sent', () => {
    // Prevents: duplicate or gapped `order` values from a client making the
    // gallery sort unstable. Position in the array is the single source.
    const result = normaliseMedia([
      { url: 'a.webp', order: 7 },
      { url: 'b.webp', order: 7 },
      { url: 'c.webp' },
    ])

    expect(result.map((m) => m.order)).toEqual([0, 1, 2])
  })

  it('drops fields the media table does not have', () => {
    // The DTO whitelists, but this runs on anything the service is handed.
    const result = normaliseMedia([
      { url: 'a.webp', alt: 'Ihram set', isPrimary: true, order: 0 },
    ])

    expect(Object.keys(result[0]).sort()).toEqual(['alt', 'isPrimary', 'order', 'url'])
  })

  it('returns an empty list unchanged rather than inventing a primary', () => {
    // A product with no photos is legitimate — it renders the brand mark.
    expect(normaliseMedia([])).toEqual([])
  })
})
