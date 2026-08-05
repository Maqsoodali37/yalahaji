import type { MetadataRoute } from 'next'

/**
 * Generates /robots.txt for the storefront.
 *
 * The admin dashboard lives on its own host (yh-admin.yalahaji.com) and has
 * its own robots.ts that blocks everything — a robots.txt only governs the
 * host that serves it, so it cannot be covered from here.
 */

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')

// Private or user-state routes: nothing to index, and crawling them burns
// budget on pages that render empty without a session. Locale-prefixed, so
// each is listed with a wildcard for the /en /ur /ar segment.
const PRIVATE_PATHS = [
  '/account',
  '/cart',
  '/checkout',
  '/auth',
  '/login',
  '/register',
  '/compare',
]

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    '/api/',
    '/_next/',
    ...PRIVATE_PATHS.flatMap((path) => [path, `/*${path}`]),
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
