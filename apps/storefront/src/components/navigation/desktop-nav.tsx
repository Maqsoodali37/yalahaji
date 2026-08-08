'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { MenuLink, matchesDevice } from './menu-link'
import { MegaPanel } from './mega-panel'
import { useActiveMenuItem } from './use-active-menu-item'
import { useMenu } from './menu-context'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { MenuItem } from '@/types'

/** Plain nested dropdown, for an item with children that is not a mega menu. */
function Dropdown({ items, depth = 0 }: { items: MenuItem[]; depth?: number }) {
  const isActive = useActiveMenuItem()

  return (
    <ul
      className={cn(
        'absolute z-50 min-w-[220px] bg-white border border-line rounded-md shadow-lg p-1.5 animate-fade-in',
        // A second level opens beside its parent, not below it. `start`/`end`
        // rather than `left`/`right` so it flips correctly in Urdu and Arabic
        // — this menu is the most obvious place an RTL layout breaks.
        depth === 0 ? 'top-full start-0' : 'top-0 start-full',
      )}
    >
      {items.map((item) => (
        <li key={item.id} className="relative group/item">
          <MenuLink
            item={item}
            aria-haspopup={item.children.length > 0 ? 'true' : undefined}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 text-[13.5px] rounded-sm transition-colors',
              item.href ? 'text-ink-2 hover:bg-green-tint hover:text-green' : 'text-stone font-semibold cursor-default',
              isActive(item) && 'text-green bg-green-tint',
            )}
          >
            {item.children.length > 0 && (
              <ChevronDown className="w-3.5 h-3.5 opacity-60 -rotate-90 rtl:rotate-90 ms-auto" />
            )}
          </MenuLink>

          {item.children.length > 0 && (
            <div className="hidden group-hover/item:block group-focus-within/item:block">
              <Dropdown
                items={item.children.filter((c) => matchesDevice(c, 'desktop'))}
                depth={depth + 1}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * Desktop header navigation, rendered entirely from the header menu.
 *
 * Replaces the `NAV_LINKS` array that used to live in `header.tsx`. That
 * array carried an `accent` boolean and a `hasMega` boolean, both of which
 * were per-item exceptions written in code — the first is now a badge, the
 * second an `isMegaMenu` flag on the row.
 */
export function DesktopNav() {
  const t = useTranslations('nav')
  const menu = useMenu('header')
  const isActive = useActiveMenuItem()
  const [openId, setOpenId] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)

  const close = useCallback(() => setOpenId(null), [])

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) close()
    }
    // Escape closes the open panel. Without it a keyboard user who has
    // tabbed into a mega menu has no way out except tabbing through every
    // link inside it.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [close])

  // No menu configured, or every item filtered out. Rendering an empty 44px
  // bar with a border would look like a broken header; rendering nothing
  // simply removes the row.
  const items = (menu?.items ?? []).filter((item) => matchesDevice(item, 'desktop'))
  if (items.length === 0) return null

  return (
    <nav ref={navRef} className="hidden md:block border-t border-line" aria-label={t('primaryNav')}>
      {/* `relative` so a mega panel can anchor to the whole nav row rather
          than to the item that opened it — see MegaPanel. */}
      <div className="container-max relative">
        <ul className="flex items-center gap-0.5 h-11">
          {items.map((item) => {
            const hasPanel = item.isMegaMenu || item.children.length > 0
            const active = isActive(item)

            return (
              <li
                key={item.id}
                // A mega panel positions against the nav container, so its
                // item must NOT be a positioned ancestor. A plain dropdown
                // still hangs off its own item.
                className={item.isMegaMenu ? 'static' : 'relative'}
                onMouseEnter={() => setOpenId(hasPanel ? item.id : null)}
                onMouseLeave={close}
                // Focus, not just hover. Without these a keyboard or
                // touch user cannot open a dropdown or a mega panel **at
                // all** — hover is not an interaction either of them has,
                // and the Escape handler above was guarding a state they
                // could never reach.
                onFocusCapture={() => setOpenId(hasPanel ? item.id : null)}
                onBlurCapture={(e) => {
                  // Only close when focus actually left this item's subtree.
                  // Tabbing from the trigger into the panel below it is a
                  // blur on the trigger, and closing there would snatch the
                  // panel away at the moment it was about to be used.
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close()
                }}
              >
                <MenuLink
                  item={item}
                  onNavigate={close}
                  aria-haspopup={hasPanel ? 'true' : undefined}
                  aria-expanded={hasPanel ? openId === item.id : undefined}
                  className={cn(
                    'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-sm transition-colors whitespace-nowrap',
                    // The old array used `accent: true` to turn "Sale" red.
                    // A badge is the data-driven equivalent, so the next
                    // promoted link needs no code change.
                    item.badge ? 'text-alert hover:bg-red-50' : 'text-ink-2 hover:text-green hover:bg-green-tint',
                    (active || openId === item.id) && 'bg-green-tint text-green',
                  )}
                >
                  {hasPanel && <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
                </MenuLink>

                {hasPanel && openId === item.id && (
                  item.isMegaMenu ? (
                    <MegaPanel item={item} />
                  ) : (
                    <Dropdown items={item.children.filter((c) => matchesDevice(c, 'desktop'))} />
                  )
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
