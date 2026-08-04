'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Home, Search, ShoppingCart, Heart, User } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useState } from 'react'
import { SearchDropdown } from './search-dropdown'

export function MobileBottomBar() {
  const locale = useLocale()
  const openCart = useCartStore((s) => s.openCart)
  const itemCount = useCartStore((s) => s.itemCount())
  const wishlistCount = useWishlistStore((s) => s.count())
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t border-line safe-area-bottom">
        <div className="grid grid-cols-5 h-16">
          <Link
            href={`/${locale}`}
            className="flex flex-col items-center justify-center gap-1 text-stone hover:text-green transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-stone hover:text-green transition-colors"
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Search</span>
          </button>

          <button
            onClick={openCart}
            className="flex flex-col items-center justify-center gap-1 text-stone hover:text-green transition-colors relative"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-gold text-ink text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Cart</span>
          </button>

          <Link
            href={`/${locale}/account/wishlist`}
            className="flex flex-col items-center justify-center gap-1 text-stone hover:text-green transition-colors relative"
          >
            <div className="relative">
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-alert text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Wishlist</span>
          </Link>

          <Link
            href={`/${locale}/account`}
            className="flex flex-col items-center justify-center gap-1 text-stone hover:text-green transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Account</span>
          </Link>
        </div>
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-white md:hidden">
          <SearchDropdown onClose={() => setSearchOpen(false)} fullscreen />
        </div>
      )}
    </>
  )
}
