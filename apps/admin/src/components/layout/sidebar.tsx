'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { visibleGroups } from './nav-config'
import type { Role } from '@/types'

interface SidebarProps {
  role: Role | undefined
  open: boolean
  onClose: () => void
}

export function Sidebar({ role, open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const groups = visibleGroups(role)

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      {/* Mobile scrim */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-60 bg-green text-white flex flex-col',
          'transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="text-lg" aria-hidden>
              🕋
            </span>
            <span className="serif text-lg">Yala Haji</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-white/70 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-green-tint/50">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                          active
                            ? 'bg-white/15 text-white font-semibold'
                            : 'text-green-tint/75 hover:bg-white/10 hover:text-white',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="flex-1">{item.label}</span>
                        {item.comingSoon && (
                          <span className="text-[9px] uppercase tracking-wide text-green-tint/40">
                            Soon
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-5 py-3 border-t border-white/10">
          <p className="text-[10px] text-green-tint/40">Yala Haji Admin v0.1</p>
        </div>
      </aside>
    </>
  )
}
