'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { MenuLink, matchesDevice } from './menu-link'
import { useActiveMenuItem } from './use-active-menu-item'
import { SafeImage } from '@/components/ui/safe-image'
import { MegaProducts } from './mega-products'
import { cn } from '@/lib/utils'
import type { Locale, MenuItem, MegaBlock } from '@/types'

/**
 * Column counts as literal class names.
 *
 * Tailwind scans source files for complete class strings, so
 * `grid-cols-${n}` produces a class that exists in the markup and in no
 * stylesheet — the panel silently renders as a single column. The API caps
 * `megaColumns` at 6, which is the same set enumerated here.
 */
const COLUMN_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
}

/** Panel width tracks the column count so two columns are not stretched across 1100px. */
const WIDTH_CLASS: Record<number, string> = {
  1: 'w-[280px]',
  2: 'w-[520px]',
  3: 'w-[720px]',
  4: 'w-[900px]',
  5: 'w-[1040px]',
  6: 'w-[1160px]',
}

function ChildColumn({ item, depth = 0 }: { item: MenuItem; depth?: number }) {
  const isActive = useActiveMenuItem()

  return (
    <li>
      <MenuLink
        item={item}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-sm text-[13.5px] transition-colors',
          depth === 0 ? 'font-semibold text-ink' : 'text-ink-2',
          item.href ? 'hover:bg-green-tint hover:text-green' : 'cursor-default',
          isActive(item) && item.href && 'text-green bg-green-tint',
        )}
      />
      {item.children.length > 0 && (
        <ul className="mt-0.5 ms-2 space-y-0.5 border-s border-line ps-2">
          {item.children
            .filter((child) => matchesDevice(child, 'desktop'))
            .map((child) => (
              <ChildColumn key={child.id} item={child} depth={depth + 1} />
            ))}
        </ul>
      )}
    </li>
  )
}

function ContentBlock({ block, locale }: { block: MegaBlock; locale: Locale }) {
  const heading = block.heading?.[locale] || block.heading?.en
  const body = block.body?.[locale] || block.body?.en

  return (
    <div className="space-y-2">
      {heading && (
        <h4 className="text-[11px] font-extrabold uppercase tracking-[.11em] text-stone">
          {heading}
        </h4>
      )}
      {block.image && (
        <SafeImage
          src={block.image}
          alt={heading ?? ''}
          loading="lazy"
          className="w-full rounded-sm object-cover"
        />
      )}
      {body && <p className="text-[13px] text-ink-2 leading-relaxed">{body}</p>}
      {block.links.length > 0 && (
        <ul className="space-y-1">
          {block.links.map((link) => (
            <li key={`${link.href}-${link.label.en}`}>
              <Link
                href={link.href}
                className="text-[13.5px] text-ink-2 hover:text-green transition-colors"
              >
                {link.label[locale] || link.label.en}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The dropdown panel for an item configured as a mega menu.
 *
 * Layout comes entirely from the API — `megaLayout` picks the arrangement,
 * `megaColumns` the width, and `megaConfig` supplies the banner and the
 * content blocks. Nothing here is per-category: the panel that used to exist
 * held a hardcoded `MEGA_DATA` map keyed by `'ihram'`, so a second mega menu
 * meant editing this file.
 *
 * The panel markup is deliberately not code-split: it renders from data the
 * header already has and mounts only while the item is open, so there is
 * nothing to defer.
 *
 * What does weigh something is the imagery, and that is deferred two ways —
 * every SafeImage here passes `loading="lazy"` explicitly (SafeImage does NOT
 * set it by default; only ProductImage does), and the featured-products strip
 * fetches its catalogue rows on first open rather than at page load.
 */
export function MegaPanel({ item }: { item: MenuItem }) {
  const locale = useLocale() as Locale

  const columns = Math.min(Math.max(item.megaColumns || 4, 1), 6)
  const layout = item.megaLayout ?? 'columns'
  const config = item.megaConfig
  const banner = layout === 'columns_with_banner' ? config?.banner ?? null : null

  const children = item.children.filter((child) => matchesDevice(child, 'desktop'))

  // The banner occupies one of the columns rather than being added beside
  // them, so the panel keeps the width the admin configured.
  const linkColumns = banner ? Math.max(columns - 1, 1) : columns

  // `columns` tracks, always — including when a banner is present. Sizing the
  // grid to `linkColumns` while handing it `linkColumns` lists *plus* the
  // banner is one child too many, so the banner dropped onto a second row: the
  // opposite of "the banner occupies one of the columns" above.
  const grid = COLUMN_CLASS[columns]

  return (
    <div
      className={cn(
        'absolute top-full start-0 z-50 bg-white border border-line rounded-md shadow-lg p-5 animate-fade-in',
        // Positioned against the nav CONTAINER, not the `<li>` — `DesktopNav`
        // marks a mega item's `<li>` `static` so the nearest positioned
        // ancestor is `container-max`. Anchoring to the item put the panel's
        // left edge wherever that item happened to sit, so the sixth item's
        // 1160px panel started ~600px in and ran off the screen; a width cap
        // alone only fixed the first item.
        'max-w-full',
        WIDTH_CLASS[columns] ?? WIDTH_CLASS[4],
      )}
    >
      <div className={cn('grid gap-5', grid ?? 'grid-cols-4')}>
        {layout === 'featured_grid'
          ? children.map((child) => (
              <MenuLink
                key={child.id}
                item={child}
                showIcon={false}
                className="group block rounded-sm overflow-hidden hover:bg-green-tint transition-colors"
              >
                {child.image && (
                  <SafeImage
                    src={child.image}
                    alt=""
                    loading="lazy"
                    className="w-full aspect-[4/3] object-cover rounded-sm mb-2"
                  />
                )}
              </MenuLink>
            ))
          : // Balanced columns rather than one column per top-level child: a
            // mega menu with three groups and four configured columns should
            // fill the width rather than leave a gap.
            //
            // Contiguous chunks, NOT round-robin. Reading a column top to
            // bottom has to give items 1, 2, 3 — a modulo split gives
            // 1, 5, 9, so the order the admin arranged survives in the data
            // and is scrambled on screen.
            Array.from({ length: Math.min(linkColumns, children.length) }, (_, col) => {
              // The remainder is spread across the leading columns rather than
              // rounded up into all of them. `Math.ceil` alone puts 6 children
              // in 4 columns as 2/2/2/0 — a quarter of a fixed-width panel
              // left empty, which is the gap this balancing exists to close.
              const base = Math.floor(children.length / linkColumns)
              const extra = children.length % linkColumns
              const start = col * base + Math.min(col, extra)
              const end = start + base + (col < extra ? 1 : 0)

              return (
                <ul key={col} className="space-y-0.5">
                  {children.slice(start, end).map((child) => (
                    <ChildColumn key={child.id} item={child} />
                  ))}
                </ul>
              )
            })}

        {banner && (
          <div className="rounded-sm overflow-hidden">
            {banner.href ? (
              <Link href={banner.href} className="block group">
                <SafeImage
                  src={banner.image}
                  alt={banner.heading?.[locale] || banner.heading?.en || ''}
                  loading="lazy"
                  className="w-full object-cover rounded-sm"
                />
                {banner.heading && (
                  <p className="mt-2 text-sm font-semibold text-ink group-hover:text-green transition-colors">
                    {banner.heading[locale] || banner.heading.en}
                  </p>
                )}
                {banner.subheading && (
                  <p className="text-xs text-stone mt-0.5">
                    {banner.subheading[locale] || banner.subheading.en}
                  </p>
                )}
              </Link>
            ) : (
              <SafeImage
                src={banner.image}
                alt={banner.heading?.[locale] || banner.heading?.en || ''}
                loading="lazy"
                className="w-full object-cover rounded-sm"
              />
            )}
          </div>
        )}
      </div>

      {layout === 'columns_with_products' && config?.featuredProductSlugs.length ? (
        <MegaProducts slugs={config.featuredProductSlugs} />
      ) : null}

      {config && config.blocks.length > 0 && (
        <div
          className={cn(
            'grid gap-5 mt-5 pt-5 border-t border-line',
            COLUMN_CLASS[Math.min(config.blocks.length, columns)] ?? 'grid-cols-3',
          )}
        >
          {config.blocks.map((block, i) => (
            <ContentBlock key={i} block={block} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}
