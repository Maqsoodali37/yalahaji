import { MenuLocation, MenuLinkType, MegaMenuLayout } from '@prisma/client'

/**
 * The navigation the storefront used to carry in code, as seed data.
 *
 * A **seed list, not a schema** — the same relationship `config-catalogue.ts`
 * has to the `settings` table. Adding a menu item in production is an INSERT
 * through the admin API; nothing here needs to change for it.
 *
 * It exists so the first deploy of the menu system renders exactly what the
 * hardcoded arrays rendered, rather than an empty header that someone has to
 * rebuild by hand from a git diff. It is applied insert-only: re-running the
 * seed never overwrites what staff have since edited.
 *
 * Two deliberate corrections to what was there before, both because the old
 * arrays had drifted from the catalogue:
 *
 *  1. The Ihram mega panel linked to `/shop/ihram-men` and
 *     `/shop/ihram-women`, and the top-level nav linked to
 *     `/shop/tabaruk-gifts`. None of the three is a category the seed creates
 *     — all three were 404s sitting in the header. The first two are replaced
 *     with filters on the real `ihram` category, which is what the mega
 *     panel's third column was already doing; the third with `dates-zamzam`,
 *     a real category the header omitted while the footer listed it.
 *  2. "About Us" appeared in both the footer's Quick Links and its Support
 *     column, so the same href was rendered twice on every page. It is kept
 *     in Quick Links only.
 */

export interface DefaultMenuItem {
  titleEn: string
  titleUr?: string
  titleAr?: string
  linkType: MenuLinkType
  targetSlug?: string
  url?: string
  badgeEn?: string
  badgeUr?: string
  badgeAr?: string
  isMegaMenu?: boolean
  megaLayout?: MegaMenuLayout
  megaColumns?: number
  megaConfig?: Record<string, unknown>
  children?: DefaultMenuItem[]
}

export interface DefaultMenu {
  location: MenuLocation
  name: string
  items: DefaultMenuItem[]
}

/** Shared by the header and the mobile drawer, which rendered the same array. */
const PRIMARY_NAV: DefaultMenuItem[] = [
  { titleEn: 'Kits', titleUr: 'کٹس', titleAr: 'الطقم', linkType: MenuLinkType.category, targetSlug: 'kits' },
  {
    titleEn: 'Ihram',
    titleUr: 'احرام',
    titleAr: 'الإحرام',
    linkType: MenuLinkType.category,
    targetSlug: 'ihram',
    isMegaMenu: true,
    megaLayout: MegaMenuLayout.columns,
    megaColumns: 2,
    children: [
      { titleEn: "Men's Ihram", titleUr: 'مردانہ احرام', titleAr: 'إحرام الرجال', linkType: MenuLinkType.custom, url: '/shop/ihram?gender=men' },
      { titleEn: "Women's Ihram", titleUr: 'زنانہ احرام', titleAr: 'إحرام النساء', linkType: MenuLinkType.custom, url: '/shop/ihram?gender=women' },
      { titleEn: 'Ihram Belts', titleUr: 'احرام بیلٹ', titleAr: 'أحزمة الإحرام', linkType: MenuLinkType.custom, url: '/shop/ihram?filter=belt' },
      { titleEn: 'Economy Ihram', titleUr: 'اکانومی احرام', titleAr: 'إحرام اقتصادي', linkType: MenuLinkType.custom, url: '/shop/ihram?tier=Economy' },
      { titleEn: 'Standard Ihram', titleUr: 'اسٹینڈرڈ احرام', titleAr: 'إحرام قياسي', linkType: MenuLinkType.custom, url: '/shop/ihram?tier=Standard' },
      { titleEn: 'Premium Ihram', titleUr: 'پریمیم احرام', titleAr: 'إحرام فاخر', linkType: MenuLinkType.custom, url: '/shop/ihram?tier=Premium' },
    ],
  },
  { titleEn: 'Abaya & Hijab', titleUr: 'عبایہ و حجاب', titleAr: 'العباءة والحجاب', linkType: MenuLinkType.category, targetSlug: 'abaya-hijab' },
  { titleEn: 'Fragrances', titleUr: 'خوشبو', titleAr: 'العطور', linkType: MenuLinkType.category, targetSlug: 'fragrances' },
  { titleEn: 'Prayer', titleUr: 'نماز کی اشیاء', titleAr: 'مستلزمات الصلاة', linkType: MenuLinkType.category, targetSlug: 'prayer-accessories' },
  // Was "Tabaruk & Gifts" -> `tabaruk-gifts`, a category the seed has never
  // created — a third 404 sitting in the header alongside the two mega-menu
  // ones. Replaced with the real category the old header omitted entirely
  // while the footer listed it.
  { titleEn: 'Dates & Zam Zam', titleUr: 'کھجور و زم زم', titleAr: 'التمور وزمزم', linkType: MenuLinkType.category, targetSlug: 'dates-zamzam' },
  { titleEn: 'Kit Builder', titleUr: 'کٹ بنائیں', titleAr: 'بناء الطقم', linkType: MenuLinkType.custom, url: '/kit-builder' },
  { titleEn: 'Blog', titleUr: 'بلاگ', titleAr: 'المدونة', linkType: MenuLinkType.custom, url: '/blog' },
  {
    titleEn: 'Sale',
    titleUr: 'سیل',
    titleAr: 'تخفيضات',
    linkType: MenuLinkType.custom,
    url: '/shop?filter=sale',
    // The old header gave this link its own red styling through an `accent`
    // boolean in the array. A badge carries the same signal as data rather
    // than as a hardcoded exception, so the next promoted link needs no code.
    badgeEn: 'Sale',
    badgeUr: 'سیل',
    badgeAr: 'تخفيضات',
  },
]

export const DEFAULT_MENUS: DefaultMenu[] = [
  // One Main Menu — `header` — drives the desktop header, the mobile drawer
  // and every mega panel. There is deliberately no separate `mobile` seed row
  // here any more: a duplicate row diverges the moment either copy is edited,
  // which is exactly what happened (`MobileNav` used to read a `mobile`
  // location seeded from this same array and then silently stopped tracking
  // it). The mobile drawer now reads this array's rows through the API and
  // filters them client-side by `device`, the same way the desktop nav does.
  { location: MenuLocation.header, name: 'Main Menu', items: PRIMARY_NAV },
  {
    location: MenuLocation.footer,
    name: 'Footer navigation',
    items: [
      {
        titleEn: 'Quick Links',
        titleUr: 'فوری لنکس',
        titleAr: 'روابط سريعة',
        // A footer column heading is not a destination — see the `heading`
        // note on MenuLinkType for why this is its own type rather than
        // `custom` with a `#`.
        linkType: MenuLinkType.heading,
        children: [
          { titleEn: 'About Us', linkType: MenuLinkType.custom, url: '/about' },
          // The public tracker, not /account/orders — this link is most often
          // clicked by exactly the people who have no account.
          { titleEn: 'Track Order', titleUr: 'آرڈر کا سراغ', titleAr: 'تتبع الطلب', linkType: MenuLinkType.custom, url: '/track-order' },
          { titleEn: 'Kit Builder', titleUr: 'کٹ بنائیں', titleAr: 'بناء الطقم', linkType: MenuLinkType.custom, url: '/kit-builder' },
          { titleEn: 'Blog', titleUr: 'بلاگ', titleAr: 'المدونة', linkType: MenuLinkType.custom, url: '/blog' },
          { titleEn: 'Sale', titleUr: 'سیل', titleAr: 'تخفيضات', linkType: MenuLinkType.custom, url: '/shop?filter=sale' },
        ],
      },
      {
        titleEn: 'Categories',
        titleUr: 'کیٹیگریز',
        titleAr: 'الفئات',
        linkType: MenuLinkType.heading,
        children: [
          { titleEn: 'Hajj & Umrah Kits', titleUr: 'حج و عمرہ کٹس', titleAr: 'طقم الحج والعمرة', linkType: MenuLinkType.category, targetSlug: 'kits' },
          { titleEn: 'Ihram', titleUr: 'احرام', titleAr: 'الإحرام', linkType: MenuLinkType.category, targetSlug: 'ihram' },
          { titleEn: 'Abaya & Hijab', titleUr: 'عبایہ و حجاب', titleAr: 'العباءة والحجاب', linkType: MenuLinkType.category, targetSlug: 'abaya-hijab' },
          { titleEn: 'Fragrances', titleUr: 'خوشبو', titleAr: 'العطور', linkType: MenuLinkType.category, targetSlug: 'fragrances' },
          { titleEn: 'Prayer Accessories', titleUr: 'نماز کی اشیاء', titleAr: 'مستلزمات الصلاة', linkType: MenuLinkType.category, targetSlug: 'prayer-accessories' },
          { titleEn: 'Dates & Zam Zam', titleUr: 'کھجور و زم زم', titleAr: 'التمور وزمزم', linkType: MenuLinkType.category, targetSlug: 'dates-zamzam' },
        ],
      },
      {
        titleEn: 'Support',
        titleUr: 'سپورٹ',
        titleAr: 'الدعم',
        linkType: MenuLinkType.heading,
        children: [
          { titleEn: 'Shipping Policy', linkType: MenuLinkType.custom, url: '/shipping' },
          { titleEn: 'Return Policy', linkType: MenuLinkType.custom, url: '/returns' },
          { titleEn: 'Terms & Conditions', linkType: MenuLinkType.custom, url: '/terms' },
        ],
      },
    ],
  },
]
