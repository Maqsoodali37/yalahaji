'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { BarChart2, ChevronRight, X, ShoppingCart, Check, Minus } from 'lucide-react'
import { useCompareStore } from '@/store/compare'
import { useCartStore } from '@/store/cart'
import { useQuery } from '@tanstack/react-query'
import { fetchProducts } from '@/lib/api'
import type { Product } from '@/types'
import { ProductImage } from '@/components/ui/product-image'
import { formatPrice, getLowestPrice, cn } from '@/lib/utils'

const ATTRIBUTES = [
  { key: 'price', label: 'Price' },
  { key: 'rating', label: 'Rating' },
  { key: 'tier', label: 'Tier' },
  { key: 'sizes', label: 'Sizes' },
  { key: 'scents', label: 'Scents' },
  { key: 'giftWrap', label: 'Gift Wrap' },
  { key: 'isKit', label: 'Kit/Bundle' },
  { key: 'sizeGuide', label: 'Size Guide' },
] as const

export default function ComparePage() {
  const locale = useLocale()
  const { ids, remove, clear } = useCompareStore()
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)

  // No bulk by-id endpoint exists, so pull a catalogue page and filter to the
  // compared ids. Adequate at this catalogue size.
  const { data } = useQuery({
    queryKey: ['compare-products'],
    queryFn: () => fetchProducts({ limit: 100 }),
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  })
  const products = (data?.items ?? []).filter((p) => ids.includes(p.id))

  const getValue = (product: Product, key: string) => {
    switch (key) {
      case 'price':
        return formatPrice(getLowestPrice(product.variants))
      case 'rating':
        return `${product.avgRating} ★ (${product.reviewCount})`
      case 'tier':
        return [...new Set(product.variants.map((v) => v.tier))].join(' / ')
      case 'sizes':
        return [...new Set(product.variants.map((v) => v.size).filter(Boolean))].join(', ') || '—'
      case 'scents':
        return [...new Set(product.variants.map((v) => v.scent).filter(Boolean))].join(', ') || '—'
      case 'giftWrap':
        return product.hasGiftWrap ? 'yes' : 'no'
      case 'isKit':
        return product.isKit ? 'yes' : 'no'
      case 'sizeGuide':
        return product.sizeGuide ? 'yes' : 'no'
      default:
        return '—'
    }
  }

  const handleAddToCart = (product: Product) => {
    const variant = product.variants[0]
    if (!variant) return
    addItem({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name.en,
      image: product.images[0]?.url ?? '',
      tier: variant.tier,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
    })
    openCart()
  }

  return (
    <div className="bg-paper min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-green-tint border-b border-line">
        <div className="container-max py-3">
          <nav className="flex items-center gap-1.5 text-sm text-stone">
            <Link href={`/${locale}`} className="hover:text-green">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/${locale}/shop`} className="hover:text-green">Shop</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-ink font-medium">Compare</span>
          </nav>
        </div>
      </div>

      <div className="container-max py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-6 h-6 text-green" />
            <h1 className="serif text-2xl text-ink">Compare Products</h1>
          </div>
          {products.length > 0 && (
            <button
              onClick={clear}
              className="text-sm text-stone hover:text-alert transition-colors font-medium"
            >
              Clear all
            </button>
          )}
        </div>

        {products.length < 2 ? (
          <div className="text-center py-20">
            <BarChart2 className="w-12 h-12 text-stone/30 mx-auto mb-4" />
            <h2 className="serif text-xl text-ink mb-2">Add at least 2 products to compare</h2>
            <p className="text-stone text-sm mb-6">
              Use the compare icon on any product card to add it here.
            </p>
            <Link href={`/${locale}/shop`} className="btn-primary">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              {/* Product header row */}
              <thead>
                <tr>
                  <th className="w-36 text-left p-3 text-xs font-semibold text-stone uppercase tracking-wider border-b border-line bg-paper" />
                  {products.map((product) => product && (
                    <th key={product.id} className="p-3 border-b border-line bg-white">
                      <div className="relative">
                        <button
                          onClick={() => remove(product.id)}
                          className="absolute -top-1 -end-1 w-6 h-6 bg-line rounded-full flex items-center justify-center text-stone hover:bg-alert hover:text-white transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-24 h-24 mx-auto bg-green-tint rounded-md overflow-hidden mb-3">
                          <ProductImage
                            src={product.images[0]?.url}
                            alt={product.name.en}
                            fallback="🕋"
                          />
                        </div>
                        <Link
                          href={`/${locale}/products/${product.slug}`}
                          className="text-sm font-semibold text-ink hover:text-green transition-colors leading-snug block text-center"
                        >
                          {product.name.en}
                        </Link>
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="btn-primary text-xs py-1.5 px-3 mt-3 w-full justify-center"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Add to Cart
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Attribute rows */}
              <tbody>
                {ATTRIBUTES.map((attr, rowIdx) => (
                  <tr
                    key={attr.key}
                    className={rowIdx % 2 === 0 ? 'bg-paper' : 'bg-white'}
                  >
                    <td className="p-3 text-xs font-semibold text-stone uppercase tracking-wider border-b border-line">
                      {attr.label}
                    </td>
                    {products.map((product) => {
                      if (!product) return null
                      const value = getValue(product, attr.key)
                      const isBool = value === 'yes' || value === 'no'
                      return (
                        <td
                          key={product.id}
                          className="p-3 text-sm text-center border-b border-line"
                        >
                          {isBool ? (
                            value === 'yes'
                              ? <Check className="w-4 h-4 text-green mx-auto" />
                              : <Minus className="w-4 h-4 text-stone/40 mx-auto" />
                          ) : (
                            <span className={cn(
                              'text-ink font-medium',
                              attr.key === 'price' && 'text-green font-bold'
                            )}>
                              {value}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
