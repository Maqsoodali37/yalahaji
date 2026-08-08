# Homepage Engine Audit

Task 01 of the homepage-engine programme. Read-only audit of what exists today,
before any code is changed. The framing is Brynstack-first: the deliverable is a
configurable homepage engine, with YalaHaji as the reference configuration.

Audited at commit `f98cfb2` (2026-08-08). Scope: `apps/storefront`, `apps/api`,
`apps/admin`, `apps/api/prisma`.

---

## Existing

### Component

The homepage is **statically composed JSX**. `apps/storefront/src/app/[locale]/page.tsx`
imports seven components by name and renders them in a fixed order:

| # | Section | File | Data source |
|---|---|---|---|
| 1 | Hero carousel | `components/home/hero-carousel.tsx` | **Hardcoded** — 3-slide array, incl. prices |
| 2 | USP strip | `components/home/usp-strip.tsx` | Hardcoded shell + i18n copy; free-shipping figure is live from settings |
| 3 | Category tiles | `components/home/category-tiles.tsx` | **API** — `fetchFeaturedCategories()` → `GET /categories`, filtered on `featured` |
| 4 | Featured products | `components/home/featured-products.tsx` | **API** — `fetchFeaturedProducts()` → `GET /products?sort=featured`; filter pills are hardcoded and inert |
| 5 | Promo split | `components/home/promo-split.tsx` | **Hardcoded** |
| 6 | Commitment | `components/home/commitment-section.tsx` | **Hardcoded** (two feature arrays) |
| 7 | Guides & tips | `components/home/guides-tips.tsx` | **Hardcoded** — 4 teasers with hand-written `/blog/<slug>` links |

Three further components exist in `components/home/` but are imported nowhere —
`blog-preview.tsx`, `seasonal-banner.tsx`, `testimonials-section.tsx` (the last one
being the only consumer of `src/data/testimonials.ts`).

Header and footer are **already API-driven** through the menu system
(`components/navigation/*`, `useMenu()` → `GET /menus/:location`), and the old
hardcoded `NAV_LINKS` arrays have been removed. That system is the closest thing in
the codebase to the engine this programme needs, and is the pattern to follow.

### API

25 modules under `apps/api/src`. Relevant to the homepage:

- `settings` — key/value store (`GET /settings/public`), typed getters, 5-minute cache,
  audit-logged writes. Adding a key is an INSERT, not a migration.
- `categories` — full tree, admin reorder/bulk, per-locale name/desc/SEO. No pagination.
- `products` — `GET /products` with category, search, tier/size/color/scent, badges,
  min/max price, rating, inStock, featured, sort, page/limit.
- `menus` — the richest content-shaping module: per-location menus, nested items,
  `linkType`, `visibility`, `device`, `publishFrom`/`publishUntil`, and a normalised
  JSON `megaConfig` carrying a banner and content blocks. Cache + storefront
  revalidation (`storefront-revalidation.service.ts`).
- `blog`, `kit-categories`, `media`, `search`, `cache`.

### Database

27 models. Homepage-relevant ones: `Category` (has `bannerImage`, `featured`, `order`,
per-locale SEO), `Product` (`isFeatured`, per-locale SEO, badges, media),
`KitCategory`/`KitCategorySource` (kit-builder steps), `Menu`/`MenuItem`,
`Setting`, `BlogPost`, `AuditLog`.

Conventions worth stating up front, because a new homepage model must match them:

- Translations are **flat per-locale columns** (`nameEn`/`nameUr`/`nameAr`), never a
  translation table and never JSON. The `Locale` enum is declared in `schema.prisma`
  and used by nothing.
- SEO is likewise flat per-locale columns on the owning table.
- Ordering is a column literally named `order`.
- **No model has `deletedAt`.** "Soft delete" in this codebase means `isActive = false`.
- No model has `createdBy`/`updatedBy`; actor tracking is the generic `AuditLog` table.
- Publish scheduling exists in exactly three places: `Coupon.startsAt/expiresAt`,
  `BlogPost.published/publishedAt`, `MenuItem.publishFrom/publishUntil`.

14 migrations, sequential, no gaps. The two newest (`20260808100000_product_locale_seo`,
`20260808110000_catalogue_import`) are still listed as pending verification in `TASKS.md`.

### Admin configuration

17 screens. Real: Dashboard, Orders (+detail), Returns, Products (+new/edit),
Inventory, Categories, Menus, Store Settings. Stubs rendering `<ComingSoon>`:
Customers, Coupons, Reviews, Blog, Analytics.

Only **Categories** and **Menus** meet the full management-module checklist
(list / search / filter / create / update / soft-delete / active toggle / drag-and-drop).

---

## Reusable

These exist and must be reused rather than rebuilt:

- **The menu system as the architectural template.** `Menu` → `MenuItem` tree with
  `isActive`, `order`, `visibility`, `device`, `publishFrom`/`publishUntil`, a JSON
  config blob normalised and capped server-side, per-location cache keyed on a
  DB-configurable TTL, explicit invalidation on write, and a best-effort storefront
  revalidation ping. A homepage-section model should be this model's sibling, not a
  new invention.
- **`Setting` + `SettingsService`** for anything site-wide: currency, currency symbol,
  free-shipping threshold, shipping costs, store name/email/phone. Already public,
  cached and audit-logged. The storefront already consumes it
  (`lib/api/adapters.ts` → `CONFIG_FALLBACK`, `lib/use-shop-settings.ts`).
- **`Category`** for "shop by category": `featured`, `order`, `image`, `bannerImage`,
  per-locale name/desc/SEO, admin drag-and-drop reorder. Nothing new is needed for
  Task 05 at the data layer.
- **`GET /products` + `ProductQueryDto`** for every product rail. Featured, newest,
  category, price range, badges and sort are all already supported — Task 07 and
  Task 11 need no new ranking logic.
- **`BlogPost` + `/blog`** for Task 12 (guides/resources). Published flag, featured
  flag, per-locale title/excerpt/body, categories with counts.
- **`KitCategory`/`KitCategorySource`/`KitContent` + `/kit-categories`** for Task 09.
  The build-your-own-kit flow already exists end to end.
- **`MediaService`** (`POST /media/upload`) with a `banners` folder already in the
  allowlist, plus the admin `MediaManager` and `SingleImageUploader` components.
- **Admin primitives**: `Panel`, `FormField`, `Button`, `Pagination`, `ConfirmDialog`,
  `ToastProvider`, `useDebouncedValue`, and the drag-and-drop tree implementation.
- **Storefront i18n**: `next-intl`, `src/i18n/messages/{en,ur,ar}.json`, locale-prefixed
  routing. Task 14 must extend this, not add a second mechanism.
- **Storefront SEO**: `src/lib/seo.ts` and per-route `generateMetadata`.

---

## Needs modification

- **`apps/storefront/src/app/[locale]/page.tsx`** — must stop importing sections by name
  and instead render a section list returned by the API. This is the core of Task 03.
- **The seven homepage components** — each must take its content as props from a section
  config instead of owning a hardcoded array. Five of the seven currently own their copy.
- **`hero-carousel.tsx`** — hardest case. Hardcoded slides, hardcoded prices
  (`PKR 2,499`, `PKR 3,200`, `PKR 899`, `PKR 1,999`) that bypass `formatPrice()` and the
  currency setting entirely, and no `useTranslations` at all, so it renders English on the
  Urdu and Arabic sites. This is the same drift class as the old ₨5,000-vs-₨2,999 shipping
  bug the codebase already fixed once for the announcement bar.
- **`featured-products.tsx`** — the `['All','Kits','Ihram','Fragrances','Prayer','Bestsellers']`
  pill row is decorative; it has no click handler and no filter wiring.
- **`guides-tips.tsx`** — hardcoded `/blog/<slug>` links with no guarantee the posts exist;
  should query the existing blog API.
- **`search-dropdown.tsx`** — `TRENDING = ['Umrah Kit','Ihram','Oud Attar','Prayer Mat','Ajwa Dates']`
  is client business data in platform code.
- **`lib/payment-methods.ts`** — footer payment icons come from a hardcoded array, not
  from the `cod_enabled`/`online_payment_enabled`/`wallet_payment_enabled` settings that
  already exist.
- **`lib/seo.ts`** — `SITE_NAME`, `SOCIAL` URLs, per-locale titles/descriptions and the
  `KEYWORDS` array are YalaHaji constants compiled into the storefront. Task 15 and Task 20.
- **`ProductQueryDto.minPrice`/`maxPrice`** — the only money fields in the API expressed in
  **rupees**, not paisas (`products.service.ts:95-96` multiplies by 100). Every other money
  field — order totals, coupon subtotal, all shipping settings — is paisas. Task 11 walks
  straight into this; either fix the DTO to paisas or document it loudly.
- **`storefront-revalidation.service.ts`** — hardcoded to `revalidateMenus`. Needs
  generalising when homepage config becomes cacheable.
- **`schema.prisma`'s `Locale` enum** — declared, unused. Either use it or drop it.

---

## Missing

Nothing in the platform models a homepage as configurable content. Specifically:

- **No homepage/page/section model.** No `Page`, `HomepageSection`, `HeroSlide` — no
  table, no module, no controller, no admin screen. Reordering or disabling a homepage
  section today requires an engineer to edit `page.tsx` and redeploy.
- **No `Banner` entity.** `MEDIA_FOLDERS` includes `'banners'` as an upload prefix and
  `Category.bannerImage` is a single field, but there is no banner table, no scheduling,
  no admin CRUD.
- **No `Collection` model.** `MenuLinkType.collection` is an enum value with nothing behind
  it — a menu item of type `collection` has no table to resolve its slug against.
- **No `CmsPage` model.** Same situation: `MenuLinkType.cms_page` resolves to nothing.
- **No `Brand` model.** Same again.
- **No campaign/promotion entity** with start/end/priority. Scheduling exists on coupons
  and menu items only.
- **No price-range/budget presets.** `minPrice`/`maxPrice` filter products, but nothing
  models "Under 1,000 / 1,000–2,500 / Premium" as configurable, currency-agnostic bands.
- **No admin surface** for homepage sections, banners, collections, CMS pages, bundles,
  site-wide SEO, translations, or a media library.
- **No locale parameter on any API endpoint.** Every read returns all three language
  columns and the client picks; there is no `?locale=` and no `Accept-Language` handling.
- **No caching on products, categories, blog or kit-categories.** Only settings and menus
  are cached. Task 18 will need this.

---

## Architectural conclusion

The engine to build is a **sibling of the menu system**, not a new pattern:

```
HomepageSection (or PageSection, keyed by page)
  type          enum  hero | category | product | collection | content | banner | bundle | journey | price_range | guides | benefits
  isActive      bool
  order         int
  publishFrom   DateTime?
  publishUntil  DateTime?
  titleEn/Ur/Ar, subtitleEn/Ur/Ar
  config        Json      -- normalised and capped server-side, per type
  dataSource    Json      -- how to resolve items: featured | category | collection | manual | filter
```

served from a cached `GET /page-sections/:page` endpoint, rendered by one generic
`<SectionRenderer>` in the storefront that maps `type` → component, and managed by one
admin screen reusing the existing drag-and-drop tree, `SingleImageUploader`, and form
primitives. The five hardcoded sections become type-specific configs; the two already
API-driven ones become `dataSource` configs.

Under that shape, `Before Umrah / For Ihram / During Umrah / Hajj Essentials`,
`Build Your Own Umrah Kit`, `Under PKR 1,000`, and `Crafted for the Conscious Pilgrim`
are all **rows in the YalaHaji database**, and a fashion, electronics or grocery store
gets the same homepage engine with different rows and no source changes.
