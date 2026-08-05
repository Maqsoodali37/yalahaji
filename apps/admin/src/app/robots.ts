import type { MetadataRoute } from 'next'

/**
 * Generates /robots.txt for the admin dashboard.
 *
 * The admin is staff-only and must never appear in search results, so every
 * path is disallowed for every crawler and no sitemap is advertised. The
 * storefront's robots.txt cannot cover this — a robots.txt only applies to
 * the host that serves it, and the admin runs on its own subdomain.
 *
 * This is a crawling hint, not access control. Authentication remains the
 * thing that actually protects these routes.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
  }
}
