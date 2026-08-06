import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetchResource, apiFetchSafe, ApiError } from './client'

/**
 * `apiFetchResource` is what separates "this product does not exist" from
 * "the API is down". Getting that wrong is visible to customers in both
 * directions: an outage that 404s every bookmarked product and invites search
 * engines to drop the URLs, or a missing row that reaches an adapter and
 * crashes the render as an application error.
 */

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiFetchResource', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the resource when the API has one', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'p1', slug: 'ihram-set' }))

    await expect(apiFetchResource<{ id: string }>('/products/ihram-set')).resolves.toEqual({
      id: 'p1',
      slug: 'ihram-set',
    })
  })

  it('returns null on a 404 so the page can call notFound()', async () => {
    // Prevents: a deleted or unpublished product throwing, which would show
    // the error boundary rather than the 404 page.
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Not found.' }, 404))

    await expect(apiFetchResource('/products/gone')).resolves.toBeNull()
  })

  it('rethrows a 500 instead of reporting the resource as missing', async () => {
    // Prevents: a backend fault rendering "Page Not Found" with a 404 status,
    // which tells the customer their product is gone and tells Google to
    // deindex a URL that is fine.
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Boom.' }, 500))

    await expect(apiFetchResource('/products/ihram-set')).rejects.toBeInstanceOf(ApiError)
  })

  it('rethrows an unreachable API instead of reporting the resource as missing', async () => {
    // Same reason, for the case with no HTTP status at all — DNS failure,
    // refused connection, timeout. apiFetch normalises these to status 0.
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(apiFetchResource('/products/ihram-set')).rejects.toBeInstanceOf(ApiError)
  })

  it('treats a 200 carrying null as missing', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null))

    await expect(apiFetchResource('/products/ihram-set')).resolves.toBeNull()
  })

  it('treats a 200 carrying an empty object as missing', async () => {
    // Prevents: `{}` passing a truthiness check and reaching an adapter,
    // which reads `p.variants.map` off undefined and crashes the render —
    // the browser reports that as a client-side exception, not a 404.
    fetchMock.mockResolvedValue(jsonResponse({}))

    await expect(apiFetchResource('/products/ihram-set')).resolves.toBeNull()
  })
})

describe('apiFetchSafe', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('still swallows failures for list reads that must not fail a render', async () => {
    // The two helpers are deliberately different: a homepage strip degrades
    // to empty, a detail page does not.
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Boom.' }, 500))

    await expect(apiFetchSafe('/products', { items: [] })).resolves.toEqual({ items: [] })
  })
})
