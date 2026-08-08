'use client'

import {
  Package,
  Shirt,
  Sparkles,
  BookOpen,
  Gift,
  Tag,
  Home,
  Star,
  Heart,
  Truck,
  PackageSearch,
  Phone,
  Info,
  ShoppingBag,
  Percent,
  Droplet,
  MapPin,
  Users,
  type LucideIcon,
} from 'lucide-react'

/**
 * Icon names staff may put on a menu item.
 *
 * An allowlist, not a dynamic import from `lucide-react`. Resolving an
 * arbitrary string against the library's exports would pull every icon in it
 * into the client bundle — the whole set is well over a megabyte — and a
 * typo would either render nothing or throw inside the nav depending on
 * which export happened to match.
 */
const ICONS: Record<string, LucideIcon> = {
  Package,
  Shirt,
  Sparkles,
  BookOpen,
  Gift,
  Tag,
  Home,
  Star,
  Heart,
  Truck,
  PackageSearch,
  Phone,
  Info,
  ShoppingBag,
  Percent,
  Droplet,
  MapPin,
  Users,
}

/**
 * Named `MenuItemIcon`, not `MenuIcon` — `lucide-react` exports a `MenuIcon`
 * of its own (the hamburger). Inside a nav file, an editor auto-import would
 * happily pick the wrong one and still compile.
 */
export function MenuItemIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) return null
  const Icon = ICONS[name]
  // An unrecognised name renders nothing rather than a placeholder box — a
  // missing icon should be invisible, not a visible defect.
  if (!Icon) return null
  return <Icon className={className} aria-hidden="true" />
}

/** For the admin picker, once one exists. */
export const MENU_ICON_NAMES = Object.keys(ICONS)
