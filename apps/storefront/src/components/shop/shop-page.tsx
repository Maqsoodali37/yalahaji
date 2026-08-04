'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { SlidersHorizontal, Grid3X3, List, ChevronRight, X } from 'lucide-react'
import type { Product, Category } from '@/types'
import { ProductCard } from './product-card'
import { FilterSidebar } from './filter-sidebar'
import { cn } from '@/lib/utils'

interface Props {
  products: Product[]
  categories: Category[]
  activeCategory?: string
}

type SortKey = 'popularity' | 'newest' | 'price-low' | 'price-high' | 'rating'
type View = 'grid' | 'list'

const PER_PAGE_OPTIONS = [12, 24, 48]

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const arr = [...products]
  switch (sort) {
    case 'newest':
      return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    case 'price-low':
      return arr.sort((a, b) => Math.min(...a.variants.map(v => v.price)) - Math.min(...b.variants.map(v => v.price)))
    case 'price-high':
      return arr.sort((a, b) => Math.min(...b.variants.map(v => v.price)) - Math.min(...a.variants.map(v => v.price)))
    case 'rating':
      return arr.sort((a, b) => b.avgRating - a.avgRating)
    default: // popularity
      return arr.sort((a, b) => b.soldCount - a.soldCount)
  }
}

export function ShopPage({ products, categories, activeCategory }: Props) {
  const locale = useLocale()
  const t = useTranslations()

  const [sort, setSort] = useState<SortKey>('popularity')
  const [view, setView] = useState<View>('grid')
  const [perPage, setPerPage] = useState(12)
  const [page, setPage] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Filters state
  const [selectedTiers, setSelectedTiers] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 15000])
  const [inStockOnly, setInStockOnly] = useState(false)
  const [onSaleOnly, setOnSaleOnly] = useState(false)
  const [minRating, setMinRating] = useState(0)

  const activeFilters: { label: string; onRemove: () => void }[] = [
    ...selectedTiers.map((tier) => ({
      label: tier,
      onRemove: () => setSelectedTiers((prev) => prev.filter((t) => t !== tier)),
    })),
    ...(inStockOnly ? [{ label: 'In Stock', onRemove: () => setInStockOnly(false) }] : []),
    ...(onSaleOnly ? [{ label: 'On Sale', onRemove: () => setOnSaleOnly(false) }] : []),
    ...(minRating > 0 ? [{ label: `${minRating}★+`, onRemove: () => setMinRating(0) }] : []),
  ]

  const filtered = useMemo(() => {
    let result = products

    if (selectedTiers.length > 0) {
      result = result.filter((p) =>
        p.variants.some((v) => selectedTiers.includes(v.tier))
      )
    }
    result = result.filter((p) =>
      p.variants.some(
        (v) => v.price >= priceRange[0] && v.price <= priceRange[1]
      )
    )
    if (inStockOnly) {
      result = result.filter((p) => p.variants.some((v) => v.stock > 0))
    }
    if (onSaleOnly) {
      result = result.filter((p) =>
        p.variants.some((v) => v.compareAtPrice && v.compareAtPrice > v.price)
      )
    }
    if (minRating > 0) {
      result = result.filter((p) => p.avgRating >= minRating)
    }

    return sortProducts(result, sort)
  }, [products, selectedTiers, priceRange, inStockOnly, onSaleOnly, minRating, sort])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const clearAllFilters = () => {
    setSelectedTiers([])
    setPriceRange([0, 15000])
    setInStockOnly(false)
    setOnSaleOnly(false)
    setMinRating(0)
  }

  const activeCategory_ = categories.find((c) => c.slug === activeCategory)

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-green-tint border-b border-line">
        <div className="container-max py-3">
          <nav className="flex items-center gap-1.5 text-sm text-stone">
            <Link href={`/${locale}`} className="hover:text-green">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/${locale}/shop`} className="hover:text-green">Shop</Link>
            {activeCategory_ && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-ink font-medium">{activeCategory_.name.en}</span>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Collection hero — light theme, matches approved design */}
      {activeCategory_ && (
        <div className="border-b border-line bg-green-tint py-8">
          <div className="container-max">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white border border-line flex items-center justify-center text-4xl shadow-sm flex-shrink-0">
                {activeCategory_.icon}
              </div>
              <div>
                <span className="block text-[11px] font-extrabold tracking-[.14em] uppercase text-gold-deep mb-1">
                  Browse Collection
                </span>
                <h1 className="serif text-3xl md:text-4xl text-ink">{activeCategory_.name.en}</h1>
                <p className="text-ink-2 text-sm mt-1">
                  {activeCategory_.description.en}
                  <span className="ms-2 text-stone">· {filtered.length} products</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container-max py-6">
        {/* Quick filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
          {[
            { label: '⭐ Top Rated', action: () => setMinRating(4) },
            { label: '🔥 On Sale', action: () => setOnSaleOnly(true) },
            { label: '✨ New Arrivals', action: () => setSort('newest') },
            { label: '💎 Premium', action: () => setSelectedTiers(['Premium']) },
            { label: '🟢 Economy', action: () => setSelectedTiers(['Economy']) },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={chip.action}
              className="flex-shrink-0 px-4 py-1.5 text-xs font-semibold rounded-full border border-line bg-white text-stone hover:border-green hover:text-green hover:bg-green-tint transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FilterSidebar
              categories={categories}
              activeCategory={activeCategory}
              selectedTiers={selectedTiers}
              onTiersChange={setSelectedTiers}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              inStockOnly={inStockOnly}
              onInStockChange={setInStockOnly}
              onSaleOnly={onSaleOnly}
              onSaleChange={setOnSaleOnly}
              minRating={minRating}
              onMinRatingChange={setMinRating}
            />
          </aside>

          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                {/* Mobile filter toggle */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filter
                </button>

                <p className="text-sm text-stone hidden sm:block">
                  {filtered.length} results
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Sort */}
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value as SortKey); setPage(1) }}
                  className="text-xs border border-line rounded-sm px-2 py-1.5 text-ink bg-white focus:outline-none focus:border-green"
                >
                  <option value="popularity">Most Popular</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                </select>

                {/* Per page */}
                <select
                  value={perPage}
                  onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
                  className="text-xs border border-line rounded-sm px-2 py-1.5 text-ink bg-white focus:outline-none focus:border-green"
                >
                  {PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>

                {/* View toggle */}
                <div className="hidden sm:flex border border-line rounded-sm overflow-hidden">
                  <button
                    onClick={() => setView('grid')}
                    className={cn('p-1.5 transition-colors', view === 'grid' ? 'bg-green text-white' : 'text-stone hover:bg-green-tint')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={cn('p-1.5 transition-colors', view === 'list' ? 'bg-green text-white' : 'text-stone hover:bg-green-tint')}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {activeFilters.map((f, i) => (
                  <button
                    key={i}
                    onClick={f.onRemove}
                    className="flex items-center gap-1.5 text-xs font-medium bg-green-tint text-green border border-green/20 px-2.5 py-1 rounded-full hover:bg-alert hover:text-white hover:border-alert transition-colors"
                  >
                    {f.label}
                    <X className="w-3 h-3" />
                  </button>
                ))}
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-medium text-stone hover:text-alert underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Product grid */}
            {paginated.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-3xl mb-3">🔍</p>
                <p className="font-semibold text-ink">No products found</p>
                <p className="text-stone text-sm mt-1">Try adjusting your filters</p>
                <button onClick={clearAllFilters} className="btn-primary mt-4">
                  Clear Filters
                </button>
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginated.map((product) => (
                  <ProductCard key={product.id} product={product} view="grid" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {paginated.map((product) => (
                  <ProductCard key={product.id} product={product} view="list" />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-outline text-sm px-3 py-1.5 disabled:opacity-40"
                >
                  ‹ Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={cn(
                      'w-9 h-9 rounded-sm text-sm font-medium transition-colors',
                      n === page
                        ? 'bg-green text-white'
                        : 'border border-line text-stone hover:border-green hover:text-green'
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-outline text-sm px-3 py-1.5 disabled:opacity-40"
                >
                  Next ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 start-0 z-50 w-80 bg-white overflow-y-auto shadow-lg animate-slide-in-right">
            <div className="flex items-center justify-between p-4 border-b border-line">
              <h3 className="font-bold">Filters</h3>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <FilterSidebar
                categories={categories}
                activeCategory={activeCategory}
                selectedTiers={selectedTiers}
                onTiersChange={setSelectedTiers}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                inStockOnly={inStockOnly}
                onInStockChange={setInStockOnly}
                onSaleOnly={onSaleOnly}
                onSaleChange={setOnSaleOnly}
                minRating={minRating}
                onMinRatingChange={setMinRating}
              />
            </div>
            <div className="p-4 border-t border-line">
              <button onClick={() => setSidebarOpen(false)} className="btn-primary w-full justify-center">
                Show {filtered.length} Results
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
