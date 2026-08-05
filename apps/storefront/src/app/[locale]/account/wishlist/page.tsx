'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Heart } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useWishlistStore } from '@/store/wishlist'
import { fetchProducts } from '@/lib/api'
import { ProductCard } from '@/components/shop/product-card'
import type { Product } from '@/types'

export default function WishlistPage() {
  const locale = useLocale()
  const ids = useWishlistStore((s) => s.ids)
  const wishlistIds = Array.from(ids)

  // There is no bulk products-by-id endpoint, so fetch a catalogue page and
  // filter. Fine at this catalogue size; if it grows past a few hundred
  // products this should become a dedicated `?ids=` query.
  const { data } = useQuery({
    queryKey: ['wishlist-products', wishlistIds],
    queryFn: () => fetchProducts({ limit: 100 }),
    enabled: wishlistIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  const products: Product[] = (data?.items ?? []).filter((p) => ids.has(p.id))

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
