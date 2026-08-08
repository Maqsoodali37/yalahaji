'use client'

import { MenuLink, deviceClass } from './menu-link'
import { useMenu } from './menu-context'
import { useActiveMenuItem } from './use-active-menu-item'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import type { Locale } from '@/types'

/**
 * The footer's link columns, rendered from the `footer` menu.
 *
 * Replaces three inline arrays in `footer.tsx` (Quick Links, Categories,
 * Support) which had drifted from each other and from the catalogue —
 * "About Us" appeared in two of them, so every page rendered the same href
 * twice.
 *
 * A top-level item is a column: its title is the heading, its children are
 * the links. A top-level item with no children is rendered as a link on its
 * own, so a single "Careers" entry needs no wrapper column.
 */
export function FooterNav() {
  const menu = useMenu('footer')
  const locale = useLocale() as Locale
  const isActive = useActiveMenuItem()

  // A top-level item WITH children is a column. One without is a standalone
  // link and belongs in the bottom bar — see `FooterBottomLinks`.
  //
  // No device filter here: the footer renders on every viewport, so an item
  // scoped to one gets a responsive class (`deviceClass`) rather than being
  // dropped. Filtering to 'desktop' made a `device: 'mobile'` footer link
  // invisible on every screen there is.
  const columns = (menu?.items ?? []).filter((item) => item.children.length > 0)
  if (columns.length === 0) return null

  return (
    <>
      {columns.map((column) => {
        const children = column.children

        return (
          <div key={column.id} className={deviceClass(column)}>
            <h5 className="text-[11px] font-extrabold uppercase tracking-[.11em] text-stone mb-[15px]">
              {column.title[locale] || column.title.en}
            </h5>

            {children.length > 0 && (
              <ul className="space-y-2.5">
                {children.map((item) => (
                  <li key={item.id} className={deviceClass(item)}>
                    <MenuLink
                      item={item}
                      showIcon={false}
                      className={cn(
                        'text-[13.5px] transition-colors',
                        isActive(item)
                          ? 'text-gold-deep'
                          : 'text-ink-2 hover:text-gold-deep',
                      )}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </>
  )
}

/**
 * The policy strip beside the copyright line.
 *
 * Driven by the same footer menu: a top-level item with no children is a
 * standalone link rather than a column heading, and lands here.
 *
 * This strip previously held Terms, Returns and Shipping as literals — the
 * same three hrefs the Support column already rendered directly above it, so
 * every page carried each of them twice. The seed puts them in the Support
 * column only; anything an admin adds here from now on is deliberate.
 */
export function FooterBottomLinks() {
  const menu = useMenu('footer')
  const isActive = useActiveMenuItem()

  const links = (menu?.items ?? []).filter(
    (item) => item.children.length === 0 && item.href,
  )
  if (links.length === 0) return null

  return (
    <div className="flex gap-4">
      {links.map((item) => (
        <MenuLink
          key={item.id}
          item={item}
          showIcon={false}
          className={cn(
            'transition-colors',
            deviceClass(item),
            isActive(item) ? 'text-ink' : 'hover:text-ink',
          )}
        />
      ))}
    </div>
  )
}
