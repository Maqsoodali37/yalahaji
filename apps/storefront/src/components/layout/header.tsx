'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Search, ShoppingCart, Heart, BarChart2, User, Menu, X, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useCompareStore } from '@/store/compare'
import { cn } from '@/lib/utils'
import { AnnouncementBar } from './announcement-bar'
import { MegaMenu } from './mega-menu'
import { SearchDropdown } from './search-dropdown'
import { LanguageSwitcher } from './language-switcher'
import { SafeImage } from '@/components/ui/safe-image'

const NAV_LINKS = [
  { key: 'kits', href: '/shop/kits', hasMega: false },
  { key: 'ihram', href: '/shop/ihram', hasMega: true },
  { key: 'abaya', href: '/shop/abaya-hijab', hasMega: false },
  { key: 'fragrances', href: '/shop/fragrances', hasMega: false },
  { key: 'prayer', href: '/shop/prayer-accessories', hasMega: false },
  { key: 'tabaruk', href: '/shop/tabaruk-gifts', hasMega: false },
  { key: 'kitBuilder', href: '/kit-builder', hasMega: false },
  { key: 'blog', href: '/blog', hasMega: false },
  { key: 'sale', href: '/shop?filter=sale', hasMega: false, accent: true },
]

export function Header() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeMega, setActiveMega] = useState<string | null>(null)
  const headerRef = useRef<HTMLElement>(null)

  const itemCount = useCartStore((s) => s.itemCount())
  const openCart = useCartStore((s) => s.openCart)
  const wishlistCount = useWishlistStore((s) => s.count())
  const compareCount = useCompareStore((s) => s.count())

  // Close mega on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setActiveMega(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      <AnnouncementBar />
      <header
        ref={headerRef}
        className="sticky top-0 z-50 bg-white border-b border-line shadow-sm"
      >
        {/* Main header row */}
        <div className="container-max">
          <div className="flex items-center gap-4 h-[72px]">
            {/* Logo */}
            <Link href={`/${locale}`} className="flex-shrink-0" aria-label="Yala Haji — Home">
              <SafeImage
                src="/assets/logo.png"
                alt="Yala Haji — Your Journey, Our Care"
                className="h-[46px] w-auto object-contain"
              />
            </Link>

            {/* Search bar — desktop */}
            <div className="hidden md:flex flex-1 max-w-xl relative">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-3 w-full bg-green-tint border border-transparent rounded-lg px-4 h-11 text-sm text-stone hover:border-green/30 transition-colors"
              >
                <Search className="w-4 h-4 text-stone" />
                <span>{t('search' as never) || 'Search ihram, attar, kits...'}</span>
              </button>
              {searchOpen && (
                <SearchDropdown onClose={() => setSearchOpen(false)} />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 ms-auto">
              {/* Mobile search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden btn-ghost p-2.5"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Compare */}
              {compareCount > 0 && (
                <Link
                  href={`/${locale}/compare`}
                  className="hidden sm:flex btn-ghost p-2.5 relative"
                  aria-label="Compare"
                >
                  <BarChart2 className="w-5 h-5" />
                  <span className="absolute -top-0.5 -right-0.5 bg-green text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {compareCount}
                  </span>
                </Link>
              )}

              {/* Wishlist */}
              <Link
                href={`/${locale}/account/wishlist`}
                className="btn-ghost p-2.5 relative"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-alert text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Account */}
              <Link
                href={`/${locale}/account`}
                className="hidden sm:flex btn-ghost p-2.5"
                aria-label="Account"
              >
                <User className="w-5 h-5" />
              </Link>

              {/* Language switcher */}
              <LanguageSwitcher />

              {/* Cart */}
              <button
                onClick={openCart}
                className="relative flex items-center gap-2 bg-green text-white rounded-sm px-3 py-2 text-sm font-semibold hover:bg-green-mid transition-colors"
                aria-label="Cart"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">{t('cart')}</span>
                {itemCount > 0 && (
                  <span className="bg-gold text-ink text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* Mobile menu toggle */}
              <button
                className="md:hidden btn-ghost p-2.5"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Category nav — desktop */}
        <nav className="hidden md:block border-t border-line">
          <div className="container-max">
            <ul className="flex items-center gap-0.5 h-11">
              {NAV_LINKS.map((link) => (
                <li
                  key={link.key}
                  className="relative"
                  onMouseEnter={() => link.hasMega ? setActiveMega(link.key) : setActiveMega(null)}
                  onMouseLeave={() => setActiveMega(null)}
                >
                  <Link
                    href={`/${locale}${link.href}`}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-sm transition-colors whitespace-nowrap',
                      link.accent
                        ? 'text-alert hover:bg-red-50'
                        : 'text-ink-2 hover:text-green hover:bg-green-tint',
                      activeMega === link.key && 'bg-green-tint text-green'
                    )}
                  >
                    {t(link.key as never)}
                    {link.hasMega && <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
                  </Link>
                  {link.hasMega && activeMega === link.key && (
                    <MegaMenu category={link.key} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-line bg-white">
            <ul className="container-max py-3 space-y-0.5">
              {NAV_LINKS.map((link) => (
                <li key={link.key}>
                  <Link
                    href={`/${locale}${link.href}`}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'block px-3 py-2.5 text-sm font-medium rounded-sm',
                      link.accent
                        ? 'text-alert'
                        : 'text-ink-2 hover:bg-green-tint hover:text-green'
                    )}
                  >
                    {t(link.key as never)}
                  </Link>
                </li>
              ))}
              <li className="pt-2 border-t border-line mt-2">
                <Link
                  href={`/${locale}/account`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-green-tint hover:text-green rounded-sm"
                >
                  <User className="w-4 h-4" />
                  {t('account')}
                </Link>
              </li>
            </ul>
          </div>
        )}
      </header>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white">
          <SearchDropdown onClose={() => setSearchOpen(false)} fullscreen />
        </div>
      )}
    </>
  )
}
