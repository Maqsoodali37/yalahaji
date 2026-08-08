'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ExternalLink } from 'lucide-react'
import { MenuItemIcon } from './menu-item-icon'
import type { Locale, MenuItem } from '@/types'

interface Props {
  item: MenuItem
  className?: string
  /** Rendered after the label — a chevron, a count. */
  children?: React.ReactNode
  onNavigate?: () => void
  showIcon?: boolean
  showBadge?: boolean
  /**
   * Passed straight through to the rendered element.
   *
   * Declared explicitly rather than spreading `...rest`: a caller that
   * accidentally passed `href` or `rel` through a spread would silently
   * override the ones this component exists to decide, which is the whole
   * reason link rendering was centralised here.
   */
  'aria-haspopup'?: boolean | 'true' | 'false' | 'menu' | 'dialog'
  'aria-expanded'?: boolean
  'aria-current'?: 'page' | 'true' | undefined
}

/**
 * The single definition of how a menu item becomes an anchor.
 *
 * Every SEO and safety attribute is decided here, once: `rel`, `target`,
 * `title`, and whether the element is an anchor at all. Five surfaces render
 * menu items, and an attribute applied in five places is an attribute that
 * will shortly be applied in four.
 *
 * `next/link` for internal routes so navigation stays client-side and the
 * route prefetches; a plain `<a>` for external ones, because `Link` would
 * hand an off-site URL to the App Router.
 */
export function MenuLink({
  item,
  className,
  children,
  onNavigate,
  showIcon = true,
  showBadge = true,
  'aria-haspopup': ariaHasPopup,
  'aria-expanded': ariaExpanded,
  'aria-current': ariaCurrent,
}: Props) {
  const locale = useLocale() as Locale
  const t = useTranslations('nav')
  const aria = {
    'aria-haspopup': ariaHasPopup,
    'aria-expanded': ariaExpanded,
    'aria-current': ariaCurrent,
  }

  const label = item.title[locale] || item.title.en
  const title = item.titleAttr?.[locale] || item.titleAttr?.en
  const badge = showBadge ? item.badge?.[locale] || item.badge?.en : undefined

  const body = (
    <>
      {showIcon && item.icon && <MenuItemIcon name={item.icon} className="w-4 h-4 shrink-0" />}
      <span className="truncate">{label}</span>
      {badge && (
        <span className="text-[10px] font-bold uppercase tracking-wide bg-alert text-white px-1.5 py-0.5 rounded-sm">
          {badge}
        </span>
      )}
      {item.isExternal && (
        <ExternalLink className="w-3 h-3 opacity-50 shrink-0" aria-hidden="true" />
      )}
      {children}
    </>
  )

  // A heading is a label, not a destination. Rendering it as an anchor with
  // `href="#"` would put a link to nowhere in the tab order and announce it to
  // a screen reader as one.
  //
  // But a heading that *opens something* is a disclosure, and a bare `<span>`
  // has the implicit role `generic`, which permits neither `aria-haspopup` nor
  // `aria-expanded` — the attributes would be dropped, and the one item with
  // no link semantics to fall back on would announce nothing at all. So a
  // heading with a popup renders a real button; a plain one stays a span.
  if (!item.href) {
    if (ariaHasPopup) {
      return (
        <button type="button" className={className} {...aria}>
          {body}
        </button>
      )
    }
    return <span className={className}>{body}</span>
  }

  if (item.isExternal) {
    return (
      <a
        href={item.href}
        title={title}
        rel={item.rel}
        target={item.openInNewTab ? '_blank' : undefined}
        className={className}
        onClick={onNavigate}
        {...aria}
      >
        {body}
        {item.openInNewTab && <span className="sr-only"> {t('opensInNewTab')}</span>}
      </a>
    )
  }

  return (
    <Link
      href={item.href}
      title={title}
      rel={item.rel}
      target={item.openInNewTab ? '_blank' : undefined}
      className={className}
      onClick={onNavigate}
      {...aria}
    >
      {body}
    </Link>
  )
}

/**
 * Whether an item belongs in a container that only ever renders on one
 * viewport.
 *
 * Correct **only** where the caller's own container is viewport-scoped —
 * `DesktopNav` is inside `hidden md:block`, `MobileNav` inside `md:hidden`,
 * so filtering to that viewport is filtering to what would render anyway.
 *
 * For a container that renders on both (the footer, a sidebar) use
 * `deviceClass` instead. Filtering there with a fixed viewport is how a
 * `device: 'mobile'` footer link becomes invisible everywhere: the footer
 * drops it as not-desktop, and the mobile drawer never sees it because that
 * reads a different menu.
 */
export function matchesDevice(item: MenuItem, viewport: 'desktop' | 'mobile'): boolean {
  return item.device === 'all' || item.device === viewport
}

/**
 * Viewport scoping for a container that renders on **both**.
 *
 * A CSS class rather than a filter, because the viewport is not a fact the
 * server has. Filtering would need `matchMedia`, which does not exist during
 * the server render — so the markup would be built for one width and then
 * change under the customer on hydration, which React reports as a hydration
 * mismatch. Tailwind's breakpoints resolve this at paint time with no
 * JavaScript at all.
 *
 * `md` is the same breakpoint the header and the mobile bottom bar switch at.
 */
export function deviceClass(item: MenuItem): string | undefined {
  if (item.device === 'desktop') return 'hidden md:block'
  if (item.device === 'mobile') return 'md:hidden'
  return undefined
}
