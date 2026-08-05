'use client'

import { useState } from 'react'
import { Menu, LogOut, ExternalLink } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { titleCase } from '@/lib/utils'

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'http://localhost:3000'

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    : '?'

  return (
    <header className="sticky top-0 z-20 h-14 bg-white border-b border-line flex items-center gap-3 px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-ink-2 hover:text-ink"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <a
        href={STOREFRONT_URL}
        target="_blank"
        rel="noreferrer"
        className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-green"
      >
        View storefront
        <ExternalLink className="h-3 w-3" />
      </a>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 pl-2"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <div className="h-8 w-8 rounded-full bg-green-tint text-green grid place-items-center text-xs font-bold">
            {initials}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-xs font-semibold text-ink">{user?.name}</p>
            <p className="text-[10px] text-ink-3">{titleCase(user?.role ?? '')}</p>
          </div>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-md border border-line bg-white shadow-md py-1 z-20"
              role="menu"
            >
              <div className="px-3 py-2 border-b border-line">
                <p className="text-xs font-semibold text-ink truncate">{user?.name}</p>
                <p className="text-[11px] text-ink-3 truncate">{user?.phone}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-alert hover:bg-red-50"
                role="menuitem"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
