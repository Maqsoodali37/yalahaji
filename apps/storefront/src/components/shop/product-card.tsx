'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Heart, BarChart2, Plus } from 'lucide-react'
import type { Product } from '@/types'
import { useCartStore } from '@/store/cart'
import { useWishlistToggle } from '@/lib/use-wishlist-toggle'
import { useCompareStore } from '@/store/compare'
import {
  formatPrice,
  formatDiscount,
  getLowestPrice,
  getDefaultVariant,
  hasPriceRange,
  getTierBadgeClass,
  cn,
} from '@/lib/utils'
import { useState } from 'react'
import { ProductImage } from '@/components/ui/product-image'

interface Props {
  product: Product
  view?: 'grid' | 'list'
}

export function ProductCard({ product, view = 'grid' }: Props) {
  const locale = useLocale()
  const [hovered, setHovered] = useState(false)

  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const { isInWishlist, onToggle: toggleWishlist, requiresSignIn } = useWishlistToggle()
  const { isInCompare, toggle: toggleCompare } = useCompareStore()

  // One variant drives the price shown, the struck-through compare-at price,
  // the discount badge and what add-to-cart puts in the basket. These used to
  // be computed from two different variants, so the card could show one price
  // and add another.
  const defaultVariant = getDefaultVariant(product.variants)
  const displayPrice = defaultVariant?.price ?? getLowestPrice(product.variants)
  const showFrom = hasPriceRange(product.variants)

  const inWishlist = isInWishlist(product.id)
  const inCompare = isInCompare(product.id)

  const isOutOfStock = product.variants.every((v) => v.stock === 0)
  const isLowStock = !isOutOfStock && product.variants.some(
    (v) => v.stock > 0 && v.stock <= v.lowStockThreshold
  )
  // Only a genuine markdown on the variant being priced. Reading
  // `compareAtPrice` off a different variant produced "₨1,199, was ₨5,999".
  const hasDiscount = Boolean(
    defaultVariant?.compareAtPrice && defaultVariant.compareAtPrice > defaultVariant.price,
  )
  const discount = hasDiscount
    ? formatDiscount(defaultVariant!.compareAtPrice!, defaultVariant!.price)
    : 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!defaultVariant || isOutOfStock) return
    addItem({
      productId: product.id,
      variantId: defaultVariant.id,
      slug: product.slug,
      name: product.name.en,
      image: product.images[0]?.url ?? '',
      tier: defaultVariant.tier,
      size: defaultVariant.size,
      color: defaultVariant.color,
      colorHex: defaultVariant.colorHex,
      scent: defaultVariant.scent,
      price: defaultVariant.price,
      compareAtPrice: defaultVariant.compareAtPrice,
    })
    openCart()
  }

  if (view === 'list') {
    return (
      <Link
        href={`/${locale}/products/${product.slug}`}
        className="flex gap-4 p-4 bg-white border border-line rounded-md hover:shadow-card transition-shadow group"
      >
        <div className="relative w-28 h-28 flex-shrink-0 bg-paper border border-line rounded-sm overflow-hidden">
          <ProductImage src={product.images[0]?.url} alt={product.images[0]?.alt ?? product.name.en} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-ink group-hover:text-green transition-colors leading-snug">
                {product.name.en}
              </p>
              <p className="text-xs text-stone mt-0.5">{product.shortDescription.en}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-ink">
                {showFrom && <span className="text-xs font-medium text-stone me-1">From</span>}
                {formatPrice(displayPrice)}
              </p>
              {hasDiscount && (
                <p className="text-xs text-stone line-through">
                  {formatPrice(defaultVariant!.compareAtPrice!)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={handleAddToCart} className="btn-primary text-xs px-4 py-2">
              Add to Cart
            </button>
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-sm', getTierBadgeClass(defaultVariant!.tier))}>
              {defaultVariant!.tier}
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div
      className="group relative bg-white border border-line rounded-md overflow-hidden hover:shadow-md transition-all duration-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <Link href={`/${locale}/products/${product.slug}`}>
        <div className="relative aspect-square bg-paper overflow-hidden">
          <ProductImage
            src={product.images[0]?.url}
            alt={product.images[0]?.alt ?? product.name.en}
            className="absolute inset-0 object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          />

          {/* Quick view strip — matches approved .qv */}
          <div
            className={cn(
              'absolute inset-x-0 bottom-0 bg-ink/85 backdrop-blur-sm text-white text-[11.5px] font-bold uppercase tracking-[.08em] text-center py-2.5',
              'transition-all duration-300',
              hovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            )}
          >
            Quick view
          </div>
        </div>
      </Link>

      {/* Badges */}
      <div className="absolute top-2.5 start-2.5 flex flex-col gap-1">
        {product.badges.map((badge) => (
          <span
            key={badge}
            className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide',
              badge === 'new' && 'bg-green text-white',
              badge === 'hot' && 'bg-gold text-ink',
              badge === 'sale' && 'bg-alert text-white',
              badge === 'bestseller' && 'bg-green-tint text-green border border-green/20',
              badge === 'limited' && 'bg-ink text-white'
            )}
          >
            {badge}
          </span>
        ))}
        {hasDiscount && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-alert text-white">
            -{discount}%
          </span>
        )}
      </div>

      {/* Wishlist + Compare */}
      <div className="absolute top-2.5 end-2.5 flex flex-col gap-1.5">
        <button
          onClick={(e) => { e.preventDefault(); toggleWishlist(product.id) }}
          aria-label={
            requiresSignIn
              ? 'Sign in to save this to your wishlist'
              : inWishlist
                ? 'Remove from wishlist'
                : 'Save to wishlist'
          }
          aria-pressed={inWishlist}
          className={cn(
            'w-7 h-7 rounded-sm flex items-center justify-center shadow-sm transition-all duration-200',
            inWishlist
              ? 'bg-alert text-white'
              : 'bg-white text-stone hover:text-alert hover:bg-red-50'
          )}
        >
          <Heart className={cn('w-3.5 h-3.5', inWishlist && 'fill-current')} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); toggleCompare(product.id) }}
          className={cn(
            'w-7 h-7 rounded-sm flex items-center justify-center shadow-sm transition-all duration-200',
            inCompare
              ? 'bg-green text-white'
              : 'bg-white text-stone hover:text-green hover:bg-green-tint'
          )}
        >
          <BarChart2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        {/* Tier badge */}
        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-sm', getTierBadgeClass(defaultVariant!.tier))}>
          {defaultVariant!.tier}
        </span>

        <Link href={`/${locale}/products/${product.slug}`}>
          <p className="font-semibold text-sm text-ink group-hover:text-green transition-colors mt-1.5 leading-snug line-clamp-2">
            {product.name.en}
          </p>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'text-xs',
                  i < Math.round(product.avgRating) ? 'text-gold' : 'text-stone/30'
                )}
              >
                ★
              </span>
            ))}
          </div>
          <span className="text-[11px] text-stone">({product.reviewCount})</span>
        </div>

        {/* Color swatches */}
        {product.variants.some((v) => v.colorHex) && (
          <div className="flex gap-1 mt-2">
            {product.variants
              .filter((v) => v.colorHex)
              .slice(0, 5)
              .map((v) => (
                <div
                  key={v.id}
                  title={v.color}
                  className="w-4 h-4 rounded-full border-2 border-white ring-1 ring-line"
                  style={{ backgroundColor: v.colorHex }}
                />
              ))}
          </div>
        )}

        {/* Price + add button — matches approved .prow / .add */}
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <p className="font-bold text-base text-ink">
              {showFrom && <span className="text-xs font-medium text-stone me-1">From</span>}
              {formatPrice(displayPrice)}
            </p>
            {hasDiscount && (
              <p className="text-xs text-stone line-through">
                {formatPrice(defaultVariant!.compareAtPrice!)}
              </p>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            aria-label="Add to cart"
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-ink text-white flex items-center justify-center hover:bg-gold-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Stock status */}
        {isOutOfStock ? (
          <p className="text-xs text-alert font-medium mt-1">Out of Stock</p>
        ) : isLowStock ? (
          <p className="text-xs text-gold-deep font-medium mt-1">
            Only a few left!
          </p>
        ) : null}
      </div>
    </div>
  )
}
