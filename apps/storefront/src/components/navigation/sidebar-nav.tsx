'use client'

import { MenuLink, deviceClass } from './menu-link'
import { useMenu } from './menu-context'
import { useActiveMenuItem } from './use-active-menu-item'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { MenuItem } from '@/types'

function Branch({ item, depth }: { item: MenuItem; depth: number }) {
  const isActive = useActiveMenuItem()
  const active = isActive(item)
  const children = item.children

  return (
    <li className={deviceClass(item)}>
      <MenuLink
        item={item}
        className={cn(
          'flex items-center gap-2 py-1.5 text-[13.5px] rounded-sm transition-colors',
          item.href ? 'text-ink-2 hover:text-green' : 'text-stone font-semibold cursor-default',
          active && item.href && 'text-green font-semibold',
        )}
      />
      {children.length > 0 && (
        // Only the branch the customer is inside stays expanded. A sidebar
        // that renders every level of a deep catalogue at once is a wall of
        // links nobody reads.
        active && (
          <ul className="ms-2 ps-2 border-s border-line mt-0.5">
            {children.map((child) => (
              <Branch key={child.id} item={child} depth={depth + 1} />
            ))}
          </ul>
        )
      )}
    </li>
  )
}

/**
 * Optional sidebar navigation.
 *
 * Renders nothing at all when no `sidebar` menu is configured — the feature
 * is off by being absent, not by a flag. A shop that has not set one up
 * should not be paying for an empty column in its grid.
 */
export function SidebarNav({ className }: { className?: string }) {
  const t = useTranslations('nav')
  const menu = useMenu('sidebar')
  // Not device-filtered, for the same reason as the footer: a sidebar can be
  // mounted on any viewport, so scoping is a responsive class per item.
  const items = menu?.items ?? []

  if (items.length === 0) return null

  return (
    <nav className={className} aria-label={t('sectionNav')}>
      <ul className="space-y-0.5" role="list">
        {items.map((item) => (
          <Branch key={item.id} item={item} depth={0} />
        ))}
      </ul>
    </nav>
  )
}
