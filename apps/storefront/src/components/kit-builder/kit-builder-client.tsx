'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ShoppingCart, CheckCircle, ChevronRight, ChevronLeft, X } from 'lucide-react'
import { kitCategories } from '@/data/kit-categories'
import { getProductById } from '@/data/products'
import { useCartStore } from '@/store/cart'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Tier, Product } from '@/types'

type Selection = {
  categoryId: string
  productId: string
  tier: Tier
  quantity: number
}

const TIERS: Tier[] = ['Economy', 'Standard', 'Premium']

export function KitBuilderClient() {
  const locale = useLocale()
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)

  const [activeCatIdx, setActiveCatIdx] = useState(0)
  const [selections, setSelections] = useState<Record<string, Selection>>({})
  const [globalTier, setGlobalTier] = useState<Tier>('Standard')
  const [added, setAdded] = useState(false)

  const activeCategory = kitCategories[activeCatIdx]

  // Get products from kit category's own list
  const categoryProducts = activeCategory?.products?.slice(0, 6) ?? []

  const toggleSelection = (product: Product) => {
    const key = product.id
    if (selections[key]) {
      const next = { ...selections }
      delete next[key]
      setSelections(next)
    } else {
      const variant = product.variants.find((v) => v.tier === globalTier) ?? product.variants[0]
      setSelections({
        ...selections,
        [key]: {
          categoryId: activeCategory.id,
          productId: product.id,
          tier: variant?.tier ?? globalTier,
          quantity: 1,
        },
      })
    }
  }

  const kitItems = Object.values(selections)
  const kitTotal = kitItems.reduce((sum, sel) => {
    const product = getProductById(sel.productId)
    if (!product) return sum
    const variant = product.variants.find((v) => v.tier === sel.tier) ?? product.variants[0]
    return sum + (variant?.price ?? 0) * sel.quantity
  }, 0)

  const handleAddAllToCart = () => {
    kitItems.forEach((sel) => {
      const product = getProductById(sel.productId)
      if (!product) return
      const variant = product.variants.find((v) => v.tier === sel.tier) ?? product.variants[0]
      if (!variant) return
      addItem(
        {
          productId: product.id,
          variantId: variant.id,
          name: product.name.en,
          slug: product.slug,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          tier: variant.tier,
          image: product.images[0]?.url ?? '',
        },
        sel.quantity,
      )
    })
    setAdded(true)
    setTimeout(() => {
      openCart()
      setAdded(false)
    }, 800)
  }

  return (
    <div className="bg-paper min-h-screen">
      {/* Page header — light theme */}
      <div className="border-b border-line bg-white py-10">
        <div className="container-max">
          <span className="block text-[11px] font-extrabold tracking-[.14em] uppercase text-gold-deep mb-2">
            Kit Builder
          </span>
          <h1 className="serif text-3xl md:text-4xl text-ink mb-1">Build Your Hajj & Umrah Kit</h1>
          <p className="text-ink-2 text-sm">Select items from each category to create your perfect kit</p>
        </div>
      </div>

      <div className="container-max py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Categories + Products */}
          <div className="lg:col-span-2 space-y-5">
            {/* Global tier toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-stone">Set all to:</span>
              {TIERS.map((tier) => (
                <button
                  key={tier}
                  onClick={() => setGlobalTier(tier)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-sm border transition-colors',
                    globalTier === tier
                      ? 'bg-green text-white border-green'
                      : 'border-line text-stone hover:border-green/40'
                  )}
                >
                  {tier}
                </button>
              ))}
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {kitCategories.map((cat, i) => {
                const hasSelection = Object.values(selections).some((s) => s.categoryId === cat.id)
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCatIdx(i)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-sm border text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
                      activeCatIdx === i
                        ? 'border-green bg-green text-white'
                        : 'border-line bg-white text-stone hover:border-green/40'
                    )}
                  >
                    <span>{cat.icon}</span>
                    {cat.name.en}
                    {hasSelection && (
                      <span className="w-4 h-4 bg-gold rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                        ✓
                      </span>
                    )}
                    {cat.required && (
                      <span className="text-[9px] font-bold opacity-70">REQ</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Category description */}
            {activeCategory && (
              <div className="bg-green-tint border border-green/10 rounded-sm p-3">
                <p className="text-sm font-semibold text-green">{activeCategory.name.en}</p>
                <p className="text-xs text-stone mt-0.5">
                  {activeCategory.required ? 'Required for Hajj & Umrah' : 'Optional — recommended'}
                </p>
              </div>
            )}

            {/* Products grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categoryProducts.length > 0 ? (
                categoryProducts.map((product) => {
                  const isSelected = !!selections[product.id]
                  const variant = product.variants.find((v) => v.tier === globalTier) ?? product.variants[0]
                  return (
                    <button
                      key={product.id}
                      onClick={() => toggleSelection(product)}
                      className={cn(
                        'relative text-start border rounded-md p-3 transition-all',
                        isSelected
                          ? 'border-green bg-green-tint ring-1 ring-green'
                          : 'border-line bg-white hover:border-green/40'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 end-2 w-5 h-5 bg-green rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="aspect-square bg-green-tint/50 rounded-sm flex items-center justify-center text-3xl mb-2">
                        {activeCategory?.icon}
                      </div>
                      <p className="text-xs font-semibold text-ink leading-snug line-clamp-2">{product.name.en}</p>
                      <p className="text-xs text-stone mt-0.5">{variant?.tier}</p>
                      <p className="text-sm font-bold text-green mt-1">
                        {variant ? formatPrice(variant.price) : '—'}
                      </p>
                    </button>
                  )
                })
              ) : (
                <div className="col-span-3 py-10 text-center text-sm text-stone">
                  No products in this category yet.
                </div>
              )}
            </div>

            {/* Prev / Next */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setActiveCatIdx(Math.max(0, activeCatIdx - 1))}
                disabled={activeCatIdx === 0}
                className="btn-outline text-sm py-2 px-4 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => setActiveCatIdx(Math.min(kitCategories.length - 1, activeCatIdx + 1))}
                disabled={activeCatIdx === kitCategories.length - 1}
                className="btn-primary text-sm py-2 px-4 disabled:opacity-40"
              >
                Next Category
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Kit Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-line rounded-md p-5 sticky top-24">
              <h3 className="font-bold text-ink mb-1">Your Kit</h3>
              <p className="text-xs text-stone mb-4">{kitItems.length} item{kitItems.length !== 1 ? 's' : ''} selected</p>

              {kitItems.length === 0 ? (
                <p className="text-sm text-stone text-center py-8">
                  Select items from the categories to build your kit.
                </p>
              ) : (
                <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
                  {kitItems.map((sel) => {
                    const product = getProductById(sel.productId)
                    if (!product) return null
                    const variant = product.variants.find((v) => v.tier === sel.tier) ?? product.variants[0]
                    return (
                      <div key={sel.productId} className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 bg-green-tint rounded-sm flex-shrink-0 flex items-center justify-center text-base">
                          {kitCategories.find((c) => c.id === sel.categoryId)?.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink truncate text-xs">{product.name.en}</p>
                          <p className="text-[10px] text-stone">{sel.tier}</p>
                        </div>
                        <p className="font-bold text-ink text-xs flex-shrink-0">
                          {variant ? formatPrice(variant.price) : '—'}
                        </p>
                        <button
                          onClick={() => {
                            const next = { ...selections }
                            delete next[sel.productId]
                            setSelections(next)
                          }}
                          className="text-stone hover:text-alert flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="border-t border-line pt-3 mb-4">
                <div className="flex justify-between font-bold text-base">
                  <span>Kit Total</span>
                  <span className="text-green">{formatPrice(kitTotal)}</span>
                </div>
              </div>

              <button
                onClick={handleAddAllToCart}
                disabled={kitItems.length === 0}
                className={cn(
                  'w-full justify-center py-3 font-bold rounded-sm flex items-center gap-2 text-sm transition-all',
                  added
                    ? 'bg-gold text-ink'
                    : 'btn-primary disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                {added ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Add Kit to Cart
                  </>
                )}
              </button>

              <p className="text-[10px] text-stone text-center mt-2">
                Free shipping on orders over ₨2,999
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
