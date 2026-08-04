'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlist'
import { getProductById } from '@/data/products'
import { ProductCard } from '@/components/shop/product-card'
import type { Product } from '@/types'

export default function WishlistPage() {
  const locale = useLocale()
  const ids = useWishlistStore((s) => s.ids)
  const products = Array.from(ids)
    .map((id) => getProductById(id))
    .filter((p): p is Product => !!p)

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-ink text-xl">Wishlist ({products.length})</h2>
      {products.length === 0 ? (
        <div className="bg-white border border-line rounded-md p-12 text-center">
          <Heart className="w-12 h-12 text-stone mx-auto mb-4" />
          <p className="font-semibold text-ink mb-1">Your wishlist is empty</p>
          <p className="text-sm text-stone mb-4">Save items to buy later.</p>
          <Link href={`/${locale}/shop`} className="btn-primary">
            Shop Now
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
