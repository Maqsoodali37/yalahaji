'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ShoppingBag, Heart, MapPin, User, RotateCcw, LogOut, Star, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { RequireAuth } from '@/components/auth/require-auth'
import { GuestDashboard } from '@/components/account/guest-dashboard'

const NAV = [
  { href: 'orders', labelKey: 'orders', icon: ShoppingBag },
  { href: 'wishlist', labelKey: 'wishlist', icon: Heart },
  { href: 'addresses', labelKey: 'addresses', icon: MapPin },
  { href: 'profile', labelKey: 'profile', icon: User },
  { href: 'returns', labelKey: 'returns', icon: RotateCcw },
] as const

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const isHydrating = useAuthStore((s) => s.isHydrating)
  const t = useTranslations('guest')

  // The account root, ignoring the locale segment and any trailing slash.
  const isAccountRoot = /\/account\/?$/.test(pathname)

  // The persisted store starts at `user: null` and confirms the token against
  // the API asynchronously. Deciding guest-or-customer before that resolves
  // would flash the guest dashboard at every signed-in customer on reload.
  if (isHydrating) {
    return (
      <div
        className="bg-paper min-h-screen flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-5 h-5 animate-spin text-stone" />
        <span className="sr-only">{t('checking')}</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-paper min-h-screen py-10">
        <div className="container-max">
          {/*
            The account root is a friendly landing for someone who checked out
            as a guest — they have a real reason to be here and no account to
            sign in to, so bouncing them to a login form answers a question
            they did not ask. The sub-pages genuinely require an account, so
            those redirect and carry `?next=` back.
          */}
          {isAccountRoot ? <GuestDashboard /> : <RequireAuth>{children}</RequireAuth>}
        </div>
      </div>
    )
  }

  return <SignedInShell pathname={pathname}>{children}</SignedInShell>
}

function SignedInShell({
  pathname,
  children,
}: {
  pathname: string
  children: React.ReactNode
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('account')
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    router.push(`/${locale}/login`)
  }

  // Only rendered with a user present, so there is no placeholder identity to
  // invent here — the previous `user?.name ?? 'Guest User'` is gone, along
  // with the fake `guest@yalahaji.com` that sat beneath it.
  const name = user?.name ?? ''
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="bg-paper min-h-screen">
      <div className="bg-green-tint border-b border-line py-4">
        <div className="container-max">
          <h1 className="serif text-2xl text-ink">{t('title')}</h1>
        </div>
      </div>
      <div className="container-max py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <div className="bg-white border border-line rounded-md overflow-hidden">
              <div className="p-4 bg-green text-white">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2 font-bold text-lg">
                  {initials}
                </div>
                <p className="font-bold">{name}</p>
                {/* Only rendered when there is one — an account can be
                    phone-only, and an empty line under the name reads as a
                    missing value rather than an absent one. */}
                {user?.email && <p className="text-white/70 text-xs">{user.email}</p>}
                <div className="flex items-center gap-1.5 mt-2">
                  <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                  <span className="text-xs text-white/80">
                    {t('points', { count: user?.loyaltyPoints ?? 0 })}
                  </span>
                </div>
              </div>
              <nav className="divide-y divide-line">
                {NAV.map(({ href, labelKey, icon: Icon }) => {
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
                      {t(labelKey)}
                    </Link>
                  )
                })}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-alert hover:bg-red-50 transition-colors w-full text-start"
                >
                  <LogOut className="w-4 h-4" />
                  {t('signOut')}
                </button>
              </nav>
            </div>
          </aside>

          <main className="lg:col-span-3">{children}</main>
        </div>
      </div>
    </div>
  )
}
