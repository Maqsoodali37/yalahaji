'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, TrendingUp, Clock, ArrowRight } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { searchProducts } from '@/lib/api'
import { formatPrice, getLowestPrice } from '@/lib/utils'

const TRENDING = ['Umrah Kit', 'Ihram', 'Oud Attar', 'Prayer Mat', 'Ajwa Dates']

interface Props {
  onClose: () => void
  fullscreen?: boolean
}

export function SearchDropdown({ onClose, fullscreen }: Props) {
  const t = useTranslations('search')
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce so a fast typist doesn't fire a request per keystroke. 250ms is
  // below the threshold where the dropdown feels laggy but well above the
  // gap between characters in normal typing.
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(id)
  }, [query])

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchProducts(debounced, 5),
    enabled: debounced.trim().length >= 2,
    // Repeat searches within a session are common (typing, backspacing,
    // retyping), and the catalogue barely moves.
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const containerClass = fullscreen
    ? 'fixed inset-0 z-50 bg-white flex flex-col'
    : 'absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-line rounded-md shadow-lg overflow-hidden'

  return (
    <div className={containerClass}>
      {/* Input */}
      <div className="flex items-center gap-3 p-4 border-b border-line">
        <Search className="w-5 h-5 text-stone flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('placeholder')}
          className="flex-1 text-sm outline-none text-ink placeholder:text-stone bg-transparent"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-stone hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        )}
        <button onClick={onClose} className="text-stone hover:text-ink ms-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Results / defaults */}
      <div className="overflow-y-auto max-h-[400px] p-3">
        {query.length < 2 ? (
          <div>
            <p className="text-xs font-semibold text-stone uppercase tracking-wider px-2 mb-2">
              {t('trending')}
            </p>
            <ul>
              {TRENDING.map((term) => (
                <li key={term}>
                  <button
                    onClick={() => setQuery(term)}
                    className="flex items-center gap-3 w-full px-2 py-2 text-sm text-ink-2 hover:bg-green-tint rounded-sm"
                  >
                    <TrendingUp className="w-4 h-4 text-gold" />
                    {term}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : isFetching && results.length === 0 ? (
          <p className="text-sm text-stone text-center py-8">…</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-stone text-center py-8">
            {t('noResults', { query })}
          </p>
        ) : (
          <ul className="space-y-1">
            {results.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/${locale}/products/${product.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-sm hover:bg-green-tint group"
                >
                  <div className="w-10 h-10 bg-green-tint rounded-sm flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate group-hover:text-green">
                      {product.name.en}
                    </p>
                    <p className="text-xs text-stone">
                      {formatPrice(getLowestPrice(product.variants))}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`/${locale}/shop?q=${encodeURIComponent(query)}`}
                onClick={onClose}
                className="flex items-center justify-center gap-2 text-sm font-semibold text-green py-3 hover:bg-green-tint rounded-sm"
              >
                {t('viewAllResults', { query })}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}
