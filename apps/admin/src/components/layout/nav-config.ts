import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Undo2,
  Boxes,
  Users,
  Ticket,
  FolderTree,
  Star,
  FileText,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/types'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Roles allowed to see this item. Omit to allow all staff. */
  roles?: Role[]
  /** Marks sections that are not built out yet. */
  comingSoon?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

const MANAGE: Role[] = ['admin', 'manager']

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Orders', href: '/orders', icon: ShoppingCart },
      { label: 'Returns', href: '/returns', icon: Undo2 },
      { label: 'Products', href: '/products', icon: Package, roles: MANAGE },
      { label: 'Inventory', href: '/inventory', icon: Boxes, roles: MANAGE },
      { label: 'Categories', href: '/categories', icon: FolderTree, roles: MANAGE, comingSoon: true },
      { label: 'Customers', href: '/customers', icon: Users, comingSoon: true },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Coupons', href: '/coupons', icon: Ticket, roles: MANAGE, comingSoon: true },
      { label: 'Reviews', href: '/reviews', icon: Star, roles: MANAGE, comingSoon: true },
      { label: 'Blog', href: '/blog', icon: FileText, roles: MANAGE, comingSoon: true },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', href: '/analytics', icon: BarChart3, roles: MANAGE, comingSoon: true },
    ],
  },
]

export function visibleGroups(role: Role | undefined): NavGroup[] {
  if (!role) return []
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((group) => group.items.length > 0)
}
