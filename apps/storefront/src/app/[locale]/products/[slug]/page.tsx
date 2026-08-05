import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchProductBySlug, fetchRelatedProducts, fetchProductReviews } from '@/lib/api'
import { ProductDetailClient } from '@/components/product/product-detail-client'
import { ProductJsonLd } from '@/components/seo/json-ld'
import {
  SITE_NAME,
  SITE_URL,
  KEYWORDS,
  OG_LOCALES,
  asLocale,
  localeUrl,
  languageAlternates,
} from '@/lib/seo'

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

/** Trims to a whole word near `max` — avoids mid-word cuts in search snippets. */
function truncate(text: string, max = 160): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params
  const locale = asLocale(raw)
  const product = await fetchProductBySlug(slug)

  // notFound() belongs in the page, not here — return no-index metadata so a
  // stale link never gets indexed while the 404 renders.
  if (!product) {
    return { title: 'Product not found', robots: { index: false, follow: false } }
  }

  const path = `/products/${product.slug}`
  const name = product.name[locale] ?? product.name.en

  const blurb =
    product.shortDescription?.[locale] ??
    product.description?.[locale] ??
    product.description?.en ??
    ''
  const price = product.variants?.[0]?.price
  const inStock = product.variants?.some((v) => v.stock > 0) ?? false

  // Front-load the blurb, then the details that decide a click: price and stock.
  const description = truncate(
    [
      blurb,
      price ? `₨${price.toLocaleString('en-PK')}.` : '',
      inStock ? 'In stock — Cash on Delivery available.' : '',
    ]
      .filter(Boolean)
      .join(' '),
  )

  const image = product.images?.find((i) => i.isPrimary) ?? product.images?.[0]
  const imageUrl = image?.url
    ? new URL(image.url, SITE_URL).toString()
    : `${SITE_URL}/og-image.png`

  return {
    title: name, // layout's template appends "| Yala Haji"
    description,
    // Product tags and category sharpen the generic site-wide keyword list.
    keywords: [
      name,
      ...(product.tags ?? []),
      product.categorySlug,
      ...KEYWORDS[locale].slice(0, 8),
    ],
    alternates: {
      canonical: localeUrl(locale, path),
      languages: languageAlternates(path),
    },
    openGraph: {
      // 'website' rather than 'product': WhatsApp renders og:type=product
      // inconsistently, and the Product JSON-LD below carries the commerce data.
      type: 'website',
      siteName: SITE_NAME,
      title: `${name} — ${SITE_NAME}`,
      description,
      url: localeUrl(locale, path),
      locale: OG_LOCALES[locale],
      images: [{ url: imageUrl, width: 1200, height: 1200, alt: name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — ${SITE_NAME}`,
      description,
      images: [imageUrl],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { locale: raw, slug } = await params
  const locale = asLocale(raw)

  // generateMetadata already fetched this slug; Next dedupes identical fetches
  // within a render pass, so this does not cost a second round trip.
  const product = await fetchProductBySlug(slug)
  if (!product) notFound()

  // Reviews and related products both key off the product id, so they can
  // only start once it resolves — but they don't depend on each other.
  const [reviewPage, related] = await Promise.all([
    fetchProductReviews(product.id),
    fetchRelatedProducts(product.id),
  ])
  const reviews = reviewPage.items

  return (
    <>
      <ProductJsonLd product={product} locale={locale} reviews={reviews} />
      <ProductDetailClient
        product={product}
        reviews={reviews}
        relatedProducts={related}
      />
    </>
  )
}
