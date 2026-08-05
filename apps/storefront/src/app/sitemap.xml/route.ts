import { fetchProducts, fetchCategories, fetchBlogPosts } from '@/lib/api'
import { routing } from '@/i18n/routing'

/**
 * Serves /sitemap.xml.
 *
 * This is a route handler rather than Next's `app/sitemap.ts` convention for
 * one reason: the built-in generator gives no way to emit an
 * <?xml-stylesheet?> processing instruction, and without one a browser renders
 * the file as an unreadable wall of text. The stylesheet (public/sitemap.xsl)
 * is presentation only — crawlers ignore processing instructions entirely, so
 * the bytes Google parses are unchanged.
 *
 * Deliberately excluded:
 *   • The admin dashboard (yh-admin.yalahaji.com) — a separate app on a
 *     separate host. It is never a search result; see app/robots.ts there.
 *   • Account, cart, checkout and auth routes — private or user-state pages
 *     with nothing to index. Also blocked in robots.ts.
 *
 * Every entry is emitted once per locale (en · ur · ar) with a full set of
 * hreflang alternates, which is the form Google documents for multilingual
 * sites. Product, category and blog URLs come from the API, so anything staff
 * publish appears here on the next build without touching this file.
 */

// Rendered per request, NOT at build time. The entries come from the API, and
// inside `docker compose build` no API exists — BuildKit does not join the
// compose network, and the api service has not started yet regardless. Under
// `force-static` Next tried to prerender this route during the image build,
// the fetches never resolved, and the build died on Next's 60s
// static-worker timeout ("Failed to build /sitemap.xml/route ... after 3
// attempts").
//
// Serving it dynamically costs one API round trip per request, which nginx
// and any CDN in front of it absorb via the Cache-Control below. Crawlers
// fetch a sitemap a few times a day, not a few times a second.
export const dynamic = 'force-dynamic'

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')

const { locales, defaultLocale } = routing

type ChangeFreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never'

interface Entry {
  loc: string
  alternates: Record<string, string>
  lastModified: Date
  changeFrequency: ChangeFreq
  priority: number
}

/** Absolute URL for a locale-prefixed path. `path` is '' for the home page. */
function url(locale: string, path: string): string {
  return `${BASE_URL}/${locale}${path}`
}

/**
 * The five characters that are not legal as raw text in XML content or
 * attribute values. Slugs are ASCII today, but an ampersand in a future slug
 * would otherwise produce a sitemap that fails to parse.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * One entry per locale for a given path, each carrying the hreflang map for
 * all locales plus x-default pointing at the default locale.
 */
function localized(
  path: string,
  options: {
    lastModified: Date
    changeFrequency: ChangeFreq
    priority: number
  },
): Entry[] {
  // `as const` keeps each pair a tuple — Object.fromEntries rejects string[][].
  const alternates: Record<string, string> = {
    ...Object.fromEntries(locales.map((l) => [l, url(l, path)] as const)),
    'x-default': url(defaultLocale, path),
  }

  return locales.map((locale) => ({
    loc: url(locale, path),
    alternates,
    ...options,
  }))
}

async function buildEntries(): Promise<Entry[]> {
  const now = new Date()

  // A sitemap is worth little if it is half-written, but it is worth less if a
  // failed fetch takes the whole route down — apiFetchSafe already degrades
  // each call to an empty list, so a partial sitemap still serves.
  const [productPage, categories, blogPage] = await Promise.all([
    fetchProducts({ limit: 500 }),
    fetchCategories(),
    fetchBlogPosts(1, 200),
  ])
  const products = productPage.items
  const blogPosts = blogPage.items

  // ── Static pages ────────────────────────────────────────────────────────────
  const staticPages = [
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

function renderEntry(entry: Entry): string {
  const links = Object.entries(entry.alternates)
    .map(
      ([hreflang, href]) =>
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}" />`,
    )
    .join('\n')

  return [
    '  <url>',
    `    <loc>${escapeXml(entry.loc)}</loc>`,
    links,
    // W3C datetime. The sitemaps spec accepts a full ISO-8601 timestamp;
    // the date-only form is what Search Console displays either way.
    `    <lastmod>${entry.lastModified.toISOString()}</lastmod>`,
    `    <changefreq>${entry.changeFrequency}</changefreq>`,
    `    <priority>${entry.priority.toFixed(1)}</priority>`,
    '  </url>',
  ].join('\n')
}

export async function GET(): Promise<Response> {
  const entries = await buildEntries()

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.map(renderEntry),
    '</urlset>',
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      // `application/xml` (not text/xml) is what Google's docs use, and it is
      // the type that makes Chrome apply the XSLT rather than download the file.
      'Content-Type': 'application/xml; charset=utf-8',
      // Built per request, so cache it at the edge for an hour rather than
      // hitting the API on every crawler poll. `stale-while-revalidate` keeps
      // serving the old file while the new one is generated, so a slow or
      // down API never turns into a 5xx on /sitemap.xml.
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
