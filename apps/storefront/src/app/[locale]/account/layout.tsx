'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { ShoppingBag, Heart, MapPin, User, RotateCcw, LogOut, Star } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

const NAV = [
  { href: 'orders', label: 'My Orders', icon: ShoppingBag },
  { href: 'wishlist', label: 'Wishlist', icon: Heart },
  { href: 'addresses', label: 'Addresses', icon: MapPin },
  { href: 'profile', label: 'Profile', icon: User },
  { href: 'returns', label: 'Returns', icon: RotateCcw },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push(`/${locale}/login`)
  }

  const displayName = user?.name ?? 'Guest User'
  const displayEmail = user?.email ?? 'guest@yalahaji.com'
  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="bg-paper min-h-screen">
      <div className="bg-green-tint border-b border-line py-4">
        <div className="container-max">
          <h1 className="serif text-2xl text-ink">My Account</h1>
        </div>
      </div>
      <div className="container-max py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white border border-line rounded-md overflow-hidden">
              <div className="p-4 bg-green text-white">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2 font-bold text-lg">
                  {initials}
                </div>
                <p className="font-bold">{displayName}</p>
                <p className="text-white/70 text-xs">{displayEmail}</p>
                {user && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                    <span className="text-xs text-white/80">{user.loyaltyPoints} loyalty points</span>
                  </div>
                )}
              </div>
              <nav className="divide-y divide-line">
                {NAV.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname.includes(`/account/${href}`)
                  return (
                    <Link
                      key={href}
                      href={`/${locale}/account/${href}`}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-green bg-green-tint'
                          : 'text-stone hover:text-green hover:bg-green-tint'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  )
                })}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-alert hover:bg-red-50 transition-colors w-full text-start"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="lg:col-span-3">{children}</main>
        </div>
      </div>
    </div>
  )
}
