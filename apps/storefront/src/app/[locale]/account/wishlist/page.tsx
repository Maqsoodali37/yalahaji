'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Heart, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useWishlistStore } from '@/store/wishlist'
import { fetchProducts } from '@/lib/api'
import { ProductCard } from '@/components/shop/product-card'
import type { Product } from '@/types'

export default function WishlistPage() {
  const locale = useLocale()
  const t = useTranslations('account')

  const ids = useWishlistStore((s) => s.ids)
  const isSynced = useWishlistStore((s) => s.isSynced)
  const isSyncing = useWishlistStore((s) => s.isLoading)
  const sync = useWishlistStore((s) => s.sync)

  const wishlistIds = Array.from(ids)

  // The list is the account's, not the device's. `RequireAuth` in the layout
  // guarantees a session by the time this renders, so this only has to cover
  // the case where hydrate's background sync has not landed yet.
  useEffect(() => {
    if (!isSynced) void sync()
  }, [isSynced, sync])

  // There is no bulk products-by-id endpoint, so fetch a catalogue page and
  // filter. Fine at this catalogue size; if it grows past a few hundred
  // products this should become a dedicated `?ids=` query.
  const { data, isLoading, isFetched, refetch } = useQuery({
    queryKey: ['wishlist-products', wishlistIds],
    queryFn: () => fetchProducts({ limit: 100 }),
    enabled: wishlistIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  const products: Product[] = (data?.items ?? []).filter((p) => ids.has(p.id))

  // `fetchProducts` degrades to an empty page rather than throwing, so
  // `isError` never fires here. Saved ids with nothing resolved against them
  // therefore means the catalogue did not load — not that the wishlist is
  // empty. Showing "your wishlist is empty" in that case tells someone their
  // saved items are gone when they are not.
  const failedToLoad = wishlistIds.length > 0 && isFetched && products.length === 0

  // Distinguished from "empty" for the same reason: until the server list has
  // arrived, an empty set means "not loaded yet", not "nothing saved".
  const awaitingList = !isSynced && isSyncing
  const hasNothingSaved = isSynced && wishlistIds.length === 0

  const showSkeleton = awaitingList || (isLoading && wishlistIds.length > 0)

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-ink text-xl">
        {t('wishlist')} ({products.length})
      </h2>

      {showSkeleton && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: Math.max(Math.min(wishlistIds.length, 6), 3) }).map((_, i) => (
            <div key={i} className="bg-white border border-line rounded-md p-4 animate-pulse">
              <div className="aspect-square bg-line rounded-sm mb-3" />
              <div className="h-3 w-3/4 bg-line rounded-sm mb-2" />
              <div className="h-3 w-1/2 bg-line rounded-sm" />
            </div>
          ))}
        </div>
      )}

      {!showSkeleton && failedToLoad && (
        <div className="bg-white border border-alert/30 rounded-md p-12 text-center">
          <AlertCircle className="w-12 h-12 text-alert mx-auto mb-4" />
          <p className="font-semibold text-ink mb-1">Could not load your saved items</p>
          <p className="text-sm text-stone mb-4">
            Your {wishlistIds.length} saved {wishlistIds.length === 1 ? 'item is' : 'items are'}{' '}
            still there — we just could not reach the catalogue.
          </p>
          <button onClick={() => refetch()} className="btn-outline text-sm py-2 px-4">
            Try again
          </button>
        </div>
      )}

      {!showSkeleton && hasNothingSaved && (
        <div className="bg-white border border-line rounded-md p-12 text-center">
          <Heart className="w-12 h-12 text-stone mx-auto mb-4" />
          <p className="font-semibold text-ink mb-1">Your wishlist is empty</p>
          <p className="text-sm text-stone mb-4">
            Save items to buy later — they will be here on any device you sign in on.
          </p>
          <Link href={`/${locale}/shop`} className="btn-primary">
            Shop Now
          </Link>
        </div>
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
