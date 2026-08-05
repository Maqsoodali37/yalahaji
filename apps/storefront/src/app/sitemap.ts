import type { MetadataRoute } from 'next'
import { products } from '@/data/products'
import { categories } from '@/data/categories'
import { blogPosts } from '@/data/blog'
import { routing } from '@/i18n/routing'

/**
 * Generates /sitemap.xml.
 *
 * Deliberately excluded:
 *   • The admin dashboard (yh-admin.yalahaji.com) — a separate app on a
 *     separate host. It is never a search result; see app/robots.ts there.
 *   • Account, cart, checkout and auth routes — private or user-state pages
 *     with nothing to index. Also blocked in robots.ts.
 *
 * Every entry is emitted once per locale (en · ur · ar) with a full set of
 * hreflang alternates, which is the form Google documents for multilingual
 * sites. Product, category and blog URLs are derived from the data modules,
 * so new entries appear here automatically without touching this file.
 */

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')

const { locales, defaultLocale } = routing

type Entry = MetadataRoute.Sitemap[number]

/** Absolute URL for a locale-prefixed path. `path` is '' for the home page. */
function url(locale: string, path: string): string {
  return `${BASE_URL}/${locale}${path}`
}

/**
 * One sitemap entry per locale for a given path, each carrying the hreflang
 * map for all locales plus x-default pointing at the default locale.
 */
function localized(
  path: string,
  options: { lastModified?: string | Date; changeFrequency?: Entry['changeFrequency']; priority?: number } = {},
): MetadataRoute.Sitemap {
  // `as const` keeps each pair a tuple — Object.fromEntries rejects string[][].
  const languages: Record<string, string> = Object.fromEntries(
    locales.map((l) => [l, url(l, path)] as const),
  )

  return locales.map((locale) => ({
    url: url(locale, path),
    lastModified: options.lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
    alternates: {
      languages: { ...languages, 'x-default': url(defaultLocale, path) },
    },
  }))
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // ── Static pages ────────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    ...localized('', { lastModified: now, changeFrequency: 'daily', priority: 1.0 }),
    ...localized('/shop', { lastModified: now, changeFrequency: 'daily', priority: 0.9 }),
    ...localized('/kit-builder', { lastModified: now, changeFrequency: 'monthly', priority: 0.8 }),
    ...localized('/blog', { lastModified: now, changeFrequency: 'weekly', priority: 0.7 }),
    ...localized('/about', { lastModified: now, changeFrequency: 'yearly', priority: 0.5 }),
    ...localized('/shipping', { lastModified: now, changeFrequency: 'yearly', priority: 0.4 }),
    ...localized('/returns', { lastModified: now, changeFrequency: 'yearly', priority: 0.4 }),
    ...localized('/terms', { lastModified: now, changeFrequency: 'yearly', priority: 0.3 }),
  ]

  // ── Category listing pages ──────────────────────────────────────────────────
  const categoryPages = categories.flatMap((category) =>
    localized(`/shop/${category.slug}`, {
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }),
  )

  // ── Product detail pages — one per product, all locales ──────────────────────
  const productPages = products.flatMap((product) =>
    localized(`/products/${product.slug}`, {
      lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.9,
    }),
  )

  // ── Blog posts ──────────────────────────────────────────────────────────────
  const blogPages = blogPosts.flatMap((post) =>
    localized(`/blog/${post.slug}`, {
      lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }),
  )

  return [...staticPages, ...categoryPages, ...productPages, ...blogPages]
}
