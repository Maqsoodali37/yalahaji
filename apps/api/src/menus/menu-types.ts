import type {
  MenuDevice,
  MenuLinkType,
  MenuLocation,
  MegaMenuLayout,
  MenuVisibility,
} from '@prisma/client'

/**
 * Who is asking for a menu.
 *
 * Resolved server-side from the authenticated principal — never from a query
 * parameter. A client-supplied audience would put "wholesale only" one query
 * string away from public.
 */
export type MenuAudience = 'guest' | 'retail' | 'wholesale'

/** Per-locale text, flat on the wire exactly as the catalogue types are. */
export interface MenuText {
  en: string
  ur: string | null
  ar: string | null
}

/** Normalised banner block inside a mega menu. */
export interface MegaBanner {
  image: string
  href: string | null
  heading: MenuText | null
  subheading: MenuText | null
}

/** One custom content block. `links` carries its own labels; `text` is prose. */
export interface MegaBlock {
  type: 'text' | 'image' | 'links'
  heading: MenuText | null
  body: MenuText | null
  image: string | null
  links: Array<{ label: MenuText; href: string }>
}

/**
 * The shape the storefront is guaranteed, whatever an admin actually saved in
 * `megaConfig`. Every field is present; unrecognised input becomes an empty
 * list or null rather than reaching a component as `undefined`.
 */
export interface MegaConfig {
  featuredCategorySlugs: string[]
  featuredProductSlugs: string[]
  banner: MegaBanner | null
  blocks: MegaBlock[]
}

export interface MenuItemNode {
  id: string
  title: MenuText
  linkType: MenuLinkType
  targetSlug: string | null
  url: string | null
  icon: string | null
  image: string | null
  badge: MenuText | null
  order: number
  /** Kept in the payload so the storefront can filter by viewport — see MenusService. */
  device: MenuDevice
  visibility: MenuVisibility
  isMegaMenu: boolean
  megaLayout: MegaMenuLayout | null
  megaColumns: number
  megaConfig: MegaConfig | null
  relAttribute: string | null
  noFollow: boolean
  openInNewTab: boolean
  titleAttr: MenuText | null
  children: MenuItemNode[]
}

/**
 * What the admin tree returns on top of the public shape.
 *
 * Deliberately a separate type rather than making these optional on
 * `MenuItemNode`: they are the fields the public read exists to *apply and
 * then discard* — an inactive item is filtered out, a schedule has already
 * been evaluated — so leaking them into the public payload would publish the
 * existence and timing of navigation staff have not released yet.
 */
export interface AdminMenuItemNode extends Omit<MenuItemNode, 'children'> {
  parentId: string | null
  isActive: boolean
  targetId: string | null
  /** ISO strings, so the admin form can round-trip them through a date input. */
  publishFrom: string | null
  publishUntil: string | null
  children: AdminMenuItemNode[]
}

export interface MenuPayload {
  id: string
  location: MenuLocation
  name: string
  /** Seconds. The storefront mirrors this into its own fetch cache. */
  cacheTtl: number
  /** Most recent `updatedAt` across the menu and its items — an ETag-ish change marker. */
  updatedAt: string
  items: MenuItemNode[]
}
