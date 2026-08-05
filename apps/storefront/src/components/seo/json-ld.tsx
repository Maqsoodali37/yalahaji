import type { Product, Review } from '@/types'
import {
  SITE_URL,
  SITE_NAME,
  SOCIAL,
  PHONE_E164,
  DESCRIPTIONS,
  asLocale,
  localeUrl,
} from '@/lib/seo'

/**
 * Structured data (schema.org / JSON-LD).
 *
 * This is what lets Google show a rich result — star ratings, price, stock —
 * instead of a plain blue link, and it feeds the Knowledge Panel that ties the
 * site to its Facebook and Instagram pages via `sameAs`.
 */

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Data is authored in this repo, not user input. Escaping '<' still
      // guards against a stray sequence closing the script tag early.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}

/** Organization + WebSite. Rendered once, in the root layout. */
export function OrganizationJsonLd({ locale: raw }: { locale: string }) {
  const locale = asLocale(raw)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'OnlineStore',
          '@id': `${SITE_URL}/#organization`,
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/assets/logo.png`,
          image: `${SITE_URL}/og-image.png`,
          description: DESCRIPTIONS[locale],
          slogan: 'Your Journey, Our Care',
          // sameAs is how Google associates the Facebook / Instagram / YouTube
          // profiles with this business.
          sameAs: [SOCIAL.facebook, SOCIAL.instagram, SOCIAL.youtube],
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'PK',
          },
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            telephone: PHONE_E164,
            areaServed: 'PK',
            availableLanguage: ['en', 'ur', 'ar'],
          },
        }}
      />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: SITE_URL,
          name: SITE_NAME,
          inLanguage: locale,
          publisher: { '@id': `${SITE_URL}/#organization` },
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${localeUrl(locale, '/shop')}?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        }}
      />
    </>
  )
}

/**
 * Product schema — drives the price, availability and star rating that appear
 * under a product result in Google. Rendered on product detail pages.
 */
export function ProductJsonLd({
  product,
  locale: raw,
  reviews = [],
}: {
  product: Product
  locale: string
  reviews?: Review[]
}) {
  const locale = asLocale(raw)
  const name = product.name[locale] ?? product.name.en
  const description =
    product.description?.[locale] ??
    product.shortDescription?.[locale] ??
    product.description?.en ??
    ''
  const url = localeUrl(locale, `/products/${product.slug}`)

  const images = (product.images ?? []).map((i) =>
    new URL(i.url, SITE_URL).toString(),
  )

  const variants = product.variants ?? []
  const prices = variants.map((v) => v.price).filter((p) => typeof p === 'number')
  const inStock = variants.some((v) => v.stock > 0)

  // A single variant maps to Offer; several map to AggregateOffer with a range.
  const offers =
    variants.length > 1 && prices.length > 0
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'PKR',
          lowPrice: Math.min(...prices),
          highPrice: Math.max(...prices),
          offerCount: variants.length,
          availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`,
          url,
          seller: { '@id': `${SITE_URL}/#organization` },
        }
      : {
          '@type': 'Offer',
          priceCurrency: 'PKR',
          price: prices[0] ?? 0,
          availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`,
          itemCondition: 'https://schema.org/NewCondition',
          url,
          seller: { '@id': `${SITE_URL}/#organization` },
        }

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${url}#product`,
        name,
        description,
        sku: product.sku,
        image: images.length ? images : [`${SITE_URL}/og-image.png`],
        brand: { '@type': 'Brand', name: SITE_NAME },
        category: product.categorySlug,
        ...(product.tags?.length ? { keywords: product.tags.join(', ') } : {}),
        offers,
        // Google rejects an aggregateRating with reviewCount 0, so omit it.
        ...(product.reviewCount > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: product.avgRating,
                reviewCount: product.reviewCount,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
        ...(reviews.length
          ? {
              review: reviews.slice(0, 5).map((r) => ({
                '@type': 'Review',
                author: { '@type': 'Person', name: r.author },
                datePublished: r.createdAt,
                name: r.title,
                reviewBody: r.body,
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: r.rating,
                  bestRating: 5,
                  worstRating: 1,
                },
              })),
            }
          : {}),
      }}
    />
  )
}
