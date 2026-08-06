'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { Home, ShoppingBag, Search, ArrowRight, Compass } from 'lucide-react'
import { searchProducts } from '@/lib/api'
import { formatPrice, getLowestPrice } from '@/lib/utils'
import { asLocale } from '@/lib/seo'

/**
 * The 404 body, shared by `[locale]/not-found.tsx` and the `[...rest]`
 * catch-all. A client component because of the search box; everything else
 * on it is static, so it costs one small bundle on a page nobody should
 * reach twice.
 *
 * The search results link straight to product pages rather than handing the
 * query to /shop — /shop ignores `?q=` today, so a "view all results" link
 * would be a control that silently does nothing, which is exactly what
 * someone who has just hit a dead end does not need.
 */
export function NotFoundView() {
  const t = useTranslations('notFound')
  const locale = asLocale(useLocale())

  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  // Same 250ms as the header dropdown — below the point where typing feels
  // laggy, above the gap between keystrokes.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(id)
  }, [query])

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchProducts(debounced, 5),
    enabled: debounced.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  })

  const searching = debounced.trim().length >= 2

  const sections = [
    { href: `/${locale}/shop`, label: 'shop' },
    { href: `/${locale}/kit-builder`, label: 'kitBuilder' },
    { href: `/${locale}/blog`, label: 'blog' },
    { href: `/${locale}/track-order`, label: 'trackOrder' },
  ] as const

  return (
    <div className="bg-paper">
      {/*
        A 404 already tells a crawler not to index, but a stray 200 from a
        proxy or a soft-404 rewrite would otherwise leave this page eligible.
        React 19 hoists this into <head>.
      */}
      <meta name="robots" content="noindex, follow" />

      <div className="container-max py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p
            aria-hidden="true"
            className="text-gradient text-7xl md:text-9xl font-extrabold leading-none tracking-tight"
          >
            {t('code')}
          </p>

          <h1 className="serif mt-4 text-3xl md:text-4xl text-ink text-balance">
            {t('title')}
          </h1>

          <p className="mt-3 text-ink-2 text-base leading-relaxed text-balance">
            {t('body')}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link href={`/${locale}`} className="btn-primary">
              <Home className="w-4 h-4" />
              {t('home')}
            </Link>
            <Link href={`/${locale}/shop`} className="btn-outline">
              <ShoppingBag className="w-4 h-4" />
              {t('shop')}
            </Link>
          </div>
        </div>

        {/* ── Search ─────────────────────────────────────────────────── */}
        <div className="mx-auto mt-12 max-w-xl">
          <label
            htmlFor="notfound-search"
            className="block text-xs font-extrabold uppercase tracking-[.14em] text-stone text-center mb-3"
          >
            {t('searchHeading')}
          </label>

          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-4 w-4 h-4 text-stone"
            />
            <input
              id="notfound-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchLabel')}
              className="input-base ps-11"
            />
          </div>

          {searching && (
            <div
              aria-live="polite"
              className="mt-3 rounded-md border border-line bg-white p-2 shadow-card"
            >
              {isFetching && results.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone">…</p>
              ) : results.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone">
                  {t('searchNoResults', { query: debounced })}
                </p>
              ) : (
                <ul className="space-y-1">
                  {results.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/${locale}/products/${product.slug}`}
                        className="group flex items-center gap-3 rounded-sm px-2 py-2.5 hover:bg-green-tint"
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-sm font-medium text-ink group-hover:text-green">
                            {product.name[locale] || product.name.en}
                          </span>
                          <span className="block text-xs text-stone">
                            {formatPrice(getLowestPrice(product.variants))}
                          </span>
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="w-4 h-4 flex-shrink-0 text-stone opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Popular sections ───────────────────────────────────────── */}
        <div className="mx-auto mt-12 max-w-2xl">
          <p className="flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-stone mb-4">
            <Compass aria-hidden="true" className="w-3.5 h-3.5 text-gold" />
            {t('popular')}
          </p>
          <nav className="flex flex-wrap justify-center gap-2">
            {sections.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-full border border-line bg-white px-4 py-1.5 text-xs font-semibold text-stone transition-colors hover:border-green hover:bg-green-tint hover:text-green"
              >
                <SectionLabel name={s.label} />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}

/** Reads from the `nav` namespace, which already holds these four labels. */
function SectionLabel({ name }: { name: 'shop' | 'kitBuilder' | 'blog' | 'trackOrder' }) {
  const t = useTranslations('nav')
  return <>{t(name)}</>
}
