'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { Category } from '@/types'
import { cn, formatPrice } from '@/lib/utils'

interface Props {
  categories: Category[]
  activeCategory?: string
  selectedTiers: string[]
  onTiersChange: (tiers: string[]) => void
  priceRange: [number, number]
  onPriceRangeChange: (range: [number, number]) => void
  inStockOnly: boolean
  onInStockChange: (v: boolean) => void
  onSaleOnly: boolean
  onSaleChange: (v: boolean) => void
  minRating: number
  onMinRatingChange: (v: number) => void
}

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-line pb-4 mb-4 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full font-semibold text-sm text-ink mb-2"
      >
        {title}
        <ChevronDown
          className={cn('w-4 h-4 text-stone transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && children}
    </div>
  )
}

const TIERS = ['Economy', 'Standard', 'Premium']
const RATINGS = [4, 3, 2]

export function FilterSidebar({
  categories,
  activeCategory,
  selectedTiers,
  onTiersChange,
  priceRange,
  onPriceRangeChange,
  inStockOnly,
  onInStockChange,
  onSaleOnly,
  onSaleChange,
  minRating,
  onMinRatingChange,
}: Props) {
  const locale = useLocale()

  const toggleTier = (tier: string) => {
    onTiersChange(
      selectedTiers.includes(tier)
        ? selectedTiers.filter((t) => t !== tier)
        : [...selectedTiers, tier]
    )
  }

  return (
    <div className="text-sm">
      {/* Categories */}
      <FilterSection title="Category">
        <ul className="space-y-0.5">
          <li>
            <Link
              href={`/${locale}/shop`}
              className={cn(
                'block px-2 py-1.5 rounded-sm hover:bg-green-tint hover:text-green transition-colors',
                !activeCategory ? 'bg-green-tint text-green font-semibold' : 'text-stone'
              )}
            >
              All Products
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/${locale}/shop/${cat.slug}`}
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 rounded-sm hover:bg-green-tint hover:text-green transition-colors',
                  activeCategory === cat.slug
                    ? 'bg-green-tint text-green font-semibold'
                    : 'text-stone'
                )}
              >
                <span className="flex items-center gap-2">
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name.en}
                </span>
                <span className="text-[11px] text-stone/60">{cat.productCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </FilterSection>

      {/* Tier */}
      <FilterSection title="Tier">
        <div className="space-y-2">
          {TIERS.map((tier) => (
            <label key={tier} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedTiers.includes(tier)}
                onChange={() => toggleTier(tier)}
                className="w-4 h-4 rounded border-line text-green focus:ring-green"
              />
              <span
                className={cn(
                  'text-sm transition-colors group-hover:text-green',
                  selectedTiers.includes(tier) ? 'font-semibold text-green' : 'text-ink-2'
                )}
              >
                {tier}
              </span>
              <span
                className={cn(
                  'ms-auto text-[10px] font-bold px-1.5 py-0.5 rounded-sm',
                  tier === 'Economy' && 'bg-stone/10 text-stone',
                  tier === 'Standard' && 'bg-green-tint text-green',
                  tier === 'Premium' && 'bg-gold-tint text-gold-deep'
                )}
              >
                {tier[0]}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="space-y-3">
          <input
            type="range"
            min={0}
            max={15000}
            step={100}
            value={priceRange[1]}
            onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value)])}
            className="w-full accent-green"
          />
          <div className="flex items-center justify-between text-xs text-stone">
            <span>{formatPrice(priceRange[0])}</span>
            <span className="font-semibold text-ink">{formatPrice(priceRange[1])}</span>
          </div>
        </div>
      </FilterSection>

      {/* Availability */}
      <FilterSection title="Availability">
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => onInStockChange(e.target.checked)}
              className="w-4 h-4 rounded border-line text-green focus:ring-green"
            />
            <span className="text-sm text-ink-2">In Stock Only</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={onSaleOnly}
              onChange={(e) => onSaleChange(e.target.checked)}
              className="w-4 h-4 rounded border-line text-green focus:ring-green"
            />
            <span className="text-sm text-ink-2">On Sale</span>
          </label>
        </div>
      </FilterSection>

      {/* Rating */}
      <FilterSection title="Minimum Rating">
        <div className="space-y-2">
          {RATINGS.map((rating) => (
            <label key={rating} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="rating"
                checked={minRating === rating}
                onChange={() => onMinRatingChange(rating)}
                className="w-4 h-4 border-line text-green focus:ring-green"
              />
              <span className="flex items-center gap-1 text-sm text-ink-2 group-hover:text-green transition-colors">
                <span className="text-gold">{'★'.repeat(rating)}</span>
                <span className="text-stone/30">{'★'.repeat(5 - rating)}</span>
                <span className="text-stone text-xs ms-1">& up</span>
              </span>
            </label>
          ))}
          {minRating > 0 && (
            <button
              onClick={() => onMinRatingChange(0)}
              className="text-xs text-stone hover:text-alert underline"
            >
              Clear rating filter
            </button>
          )}
        </div>
      </FilterSection>
    </div>
  )
}
