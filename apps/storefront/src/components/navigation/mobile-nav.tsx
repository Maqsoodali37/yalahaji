'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { MenuLink, matchesDevice } from './menu-link'
import { useActiveMenuItem } from './use-active-menu-item'
import { useMenu } from './menu-context'
import { cn } from '@/lib/utils'
import type { MenuItem } from '@/types'

/**
 * One row of the mobile tree.
 *
 * An item with children renders **two** controls, not one: the label
 * navigates, and a separate chevron button expands. Making the whole row
 * toggle would mean a parent category could never be opened on a phone, which
 * is exactly the trap the old drawer avoided only by having no nesting at
 * all.
 */
function TreeRow({
  item,
  depth,
  onNavigate,
  autoExpand,
}: {
  item: MenuItem
  depth: number
  onNavigate: () => void
  autoExpand: boolean
}) {
  const t = useTranslations('nav')
  const isActive = useActiveMenuItem()
  const active = isActive(item)
  const children = item.children.filter((c) => matchesDevice(c, 'mobile'))
  const hasChildren = children.length > 0

  // A branch containing the current page starts open, so the drawer shows
  // where the customer is rather than making them find it again.
  const [open, setOpen] = useState(autoExpand && active)

  useEffect(() => {
    if (autoExpand && active) setOpen(true)
  }, [autoExpand, active])

  return (
    <li>
      <div className="flex items-center">
        <MenuLink
          item={item}
          onNavigate={hasChildren && !item.href ? undefined : onNavigate}
          className={cn(
            'flex items-center gap-2 flex-1 py-2.5 text-sm rounded-sm transition-colors',
            depth === 0 ? 'font-medium' : 'font-normal',
            item.badge ? 'text-alert' : 'text-ink-2',
            item.href && 'hover:bg-green-tint hover:text-green',
            active && item.href && 'text-green',
            !item.href && 'text-stone font-semibold cursor-default',
          )}
        />

        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            // Announced verbatim to a screen reader, so it goes through
            // next-intl like every other customer-facing string — an Urdu
            // user should not hear "Collapse".
            aria-label={open ? t('collapse') : t('expand')}
            className="p-2 text-stone hover:text-green transition-colors shrink-0"
          >
            <ChevronDown
              className={cn('w-4 h-4 transition-transform duration-200', open && 'rotate-180')}
            />
          </button>
        )}
      </div>

      {hasChildren && (
        // Animated by max-height rather than mounting/unmounting, so the
        // expand has something to transition. `overflow-hidden` is what
        // actually clips it while it grows.
        <div
          className={cn(
            'overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
            open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <ul className="ms-3 ps-3 border-s border-line">
            {children.map((child) => (
              <TreeRow
                key={child.id}
                item={child}
                depth={depth + 1}
                onNavigate={onNavigate}
                autoExpand={autoExpand}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

/**
 * The mobile drawer's navigation tree.
 *
 * Reads the `mobile` menu and falls back to the `header` one when no mobile
 * menu is configured — a shop that has only set up one menu should still have
 * a working drawer, and an empty drawer looks like a bug rather than a
 * configuration choice.
 */
export function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  const mobileMenu = useMenu('mobile')
  const headerMenu = useMenu('header')
  const menu = mobileMenu ?? headerMenu

  const items = (menu?.items ?? []).filter((item) => matchesDevice(item, 'mobile'))
  if (items.length === 0) return null

  return (
    <ul className="space-y-0.5" role="list">
      {items.map((item) => (
        <TreeRow key={item.id} item={item} depth={0} onNavigate={onNavigate} autoExpand />
      ))}
    </ul>
  )
}
