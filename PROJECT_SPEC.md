# Project Specification

Long-term reference for this codebase. **Read this before starting work** — it exists so the same code does not get re-reviewed every session.

Keep it current: when a feature lands or an architectural decision is made, update this file in the same change.

---

## Project Overview

### Business domain

**Yala Haji** — Pakistani e-commerce for Hajj and Umrah pilgrims. Ihram, attar and fragrances, prayer accessories, abaya/hijab, dates and Zam Zam, plus pre-assembled kits and a build-your-own kit flow.

Customers are largely Pakistan-based, mobile-first, and cash-on-delivery oriented. Content is trilingual: English, Urdu, Arabic.

### Tech stack

| Layer | Stack |
|---|---|
| API | NestJS, Prisma, MySQL 8, Redis |
| Storefront | Next.js 15 (App Router), React 19, TanStack Query, Zustand, next-intl, Tailwind |
| Admin | Next.js 15 (App Router), TanStack Query, Tailwind |
| Infra | Docker Compose, nginx |
| Tests | Jest (API), Vitest (storefront) |

### Architecture

Monorepo, three apps:

```
apps/api          NestJS REST API — the only thing that touches the database
apps/storefront   Customer-facing Next.js app, [locale] routing
apps/admin        Staff Next.js app
```

**Two separate trust domains.** Customer auth and admin auth deliberately share no transport, secret, or login endpoint:

| | Customer | Admin |
|---|---|---|
| Transport | `Authorization: Bearer` | httpOnly cookie |
| Guard | `JwtAuthGuard` | `AdminJwtAuthGuard` + `RolesGuard` |
| Secret | `JWT_SECRET` | `ADMIN_JWT_SECRET` |
| Login | `POST /auth/login` | `POST /auth/admin/login` |

The API refuses to start in production if these secrets are placeholders or identical.

`OptionalJwtAuthGuard` covers routes that serve both guests and signed-in customers (cart, order placement).

Roles: `customer`, `admin`, `manager`, `support`, `fulfillment`. Grouped as `STAFF_MANAGE` and `STAFF_ORDERS` in `auth/roles.decorator.ts`.

### Coding standards

- TypeScript strict-ish: `strictNullChecks`, `noImplicitAny` on.
- Comments explain **why**, not what. A comment restating the code is noise; a comment explaining a non-obvious constraint is the point.
- No raw SQL anywhere. All database access goes through Prisma.
- Money is integers, never floats.
- **Never default-import a CommonJS package in `apps/api`.** See below.

### `apps/api` sets `allowSyntheticDefaultImports` without `esModuleInterop`

That combination silences the compiler without changing the emit. For a package declaring `export =` — sharp, and most older CJS libraries — `import x from 'pkg'` compiles to `pkg_1.default`, which is `undefined` at runtime. It typechecks, it builds, and it throws `is not a function` the first time the code path actually runs.

This shipped: `media.service.ts` used `import sharp from 'sharp'`, so **every** upload threw a `TypeError` that a `catch` reported to staff as "that file could not be read as an image" — pointing at their perfectly good JPEG rather than at the import.

Use `import * as sharp from 'sharp'`, matching `import * as Minio from 'minio'` in the same file. A default import is only safe where the package genuinely exposes `.default` (`meilisearch` does).

Turning on `esModuleInterop` would fix the class of bug properly, but it changes the emit for every namespace import in the app and needs its own pass.

---

## Critical conventions

These are the ones that cause real bugs when broken.

### Prisma schema comments are `//` and `///`, never `/* */`

Prisma's schema language has no block comment. A `/** … */` doc block is not
ignored — every one of its lines is parsed as an unknown top-level statement,
so an eight-line comment is eight `P1012` validation errors and
`prisma generate` refuses to run at all.

This is not theoretical: a `/**` block above `enum AddressLabel` shipped with
the address work and broke the Docker build at
`RUN npx prisma generate`, before any of the application code was reached. Use
`///` for a doc comment attached to the next declaration and `//` for anything
else, which is what the rest of the file already does. A trailing `//` on a
field line is fine.

`_patch_applied/20260808_check_prisma_schema.py` walks the schema and reports
any line that is not a construct Prisma recognises at its nesting depth. It is
not a substitute for `prisma validate`, but it runs with no database, no
`node_modules` and no network — which is the situation in which this class of
error keeps getting written.

### Money is stored in paisas

The API stores, computes and returns **paisas** (1 rupee = 100 paisas) everywhere. The storefront converts to **rupees at the adapter boundary** via `paisasToRupees` / `rupeesToPaisas` in `lib/api/adapters.ts`.

A component that divides by 100 itself is a component that will one day forget. Never convert outside the adapter layer.

Exception to watch: percentages (`tax_percentage`) are not money and must not go through `paisasToRupees`.

### The storefront never imports from `lib/api/wire`

`Wire*` types are the API's shape. Adapters exist to absorb the paisas/rupees and flat/nested differences. Components import only from `@/lib/api`. Letting `Wire*` escape that directory is what reintroduces the mismatches the layer was built to prevent.

### An order's delivery address is a snapshot, not a link

`Order.addressId` is provenance — *which* saved address the customer picked. It
is **not** what any screen renders. The ten `shipping*` columns on `orders`
are, and they are written once at checkout and never touched again.

`addresses` is mutable. Reading an order's address through the relation meant a
customer editing their saved address after moving house silently rewrote the
delivery address on every order they had ever placed, including delivered ones
— where the recorded destination is the only evidence there is in a dispute
about a misdelivery. Deleting a saved address had the same effect, minus the
new address.

Three consequences to preserve:

- **Write the snapshot in `resolveAddress`/`create`**, from `ADDRESS_SNAPSHOT_SELECT`.
  Selecting only `{ id: true }` there — which is what that query used to do —
  is how this quietly becomes a link again.
- **Read it in `adaptShippingAddress`** (storefront) and `shipTo` (admin). Both
  fall back to the `address` relation *last*, and only for orders served
  mid-rolling-deploy by an instance predating the columns.
- **Columns, not JSON.** The admin order list filters on city and province; a
  JSON column would have meant rewriting that filter against an unindexed
  value. `orders_shippingCity_idx` and `orders_shippingProvince_idx` exist for it.

`POST /orders/track` must continue to expose none of them — see *Order tracking*.

### Address defaults are two flags, demoted independently

`isDefaultShipping` and `isDefaultBilling`. `UsersService.demoteDefaults` clears
only the flag the write is claiming, and excludes the row being updated from its
own sweep.

Clearing both whenever either is set would mean saving a default *delivery*
address silently stripped the customer's default *billing* address — a change
they never asked for, on a row they were not editing. Both sweeps are scoped by
`userId`: Prisma reads `where: { userId: undefined }` as `where: {}`, which
would clear the flag on every address row in the table.

**Billing is stored but read by nothing.** Cash on delivery is the only enabled
payment method, so no surface collects a billing address; the order detail page
says "same as the delivery address" rather than printing the same six lines
twice under two headings. The column exists so that adding a gateway is not also
a migration against `addresses` — the table every checkout reads.

Checkout's "make this my default" claims **shipping only**, for the same reason:
it is collecting a delivery address, and there is no billing address to attach
the other flag to.

### `country` is stored with a default, not asked for

`Address.country` is `NOT NULL DEFAULT 'Pakistan'`; `DEFAULT_COUNTRY` in
`lib/address.ts` mirrors it — change one, change both, or a form submitted
without a country lands on a different value than the one it displayed.

It lives in `lib/address.ts` rather than `lib/validation.ts` because
`adapters.ts` needs it and `validation.ts` already imports from `lib/api` —
putting it there closes an import cycle through the constant's own initialiser,
which under ESM is a temporal-dead-zone crash rather than a warning.

`SUPPORTED_COUNTRIES` in `common/validation.ts` is enforced with `@IsIn` on both
address DTOs, for the same reason `ENABLED_PAYMENT_METHODS` is: offering one
option in the storefront picker does not stop a hand-rolled request from saving
an address the shop cannot deliver to, and the first anyone would learn of it is
a courier refusing the parcel.

`formatAddressLines` renders the country **only when it is not the default**. A
line reading "Pakistan" under every address on a Pakistan-only shop is noise on
a phone-sized card; the day the shop ships abroad it appears exactly where it
matters with no code change.

### `Address.label` is free text; `labelType` is the enum

Both, deliberately. `labelType` (`home` / `office` / `other`) is what code
groups and filters on. `label` is the display name, and is the whole point of
`other` — rows saved before the enum hold what customers actually typed
("Warehouse", "Ammi's house"), and collapsing those into a category would
destroy them. The migration derives `labelType` case-insensitively and sends
anything unrecognised to `other`, where the original string stays visible.

**Checkout sends both.** It sets `label` to the city (so a one-off delivery to a
relative is not filed as the customer's home address) *and* `labelType: 'other'`.
Sending only the first undoes the second: `labelType` defaults to `home` in the
schema, so the saved address would show a "Home" chip next to the customer's
actual home address. `OrderAddressDto` accepts both, mirroring `CreateAddressDto`.

### A checkout address is only saved when the customer asks

`CreateOrderDto.saveAddress` decides whether an inline address is written with
`userId` set or `NULL`. Unowned rows behave exactly like guest addresses: they
exist to be referenced by their order and are invisible to
`/users/me/addresses`.

Every signed-in checkout used to write an owned row, so a customer who typed a
one-off delivery address — a gift to a relative, a hotel in Makkah — found it
filed in their address book, and someone ordering monthly accumulated twelve
near-duplicates of their own home address.

`setDefaultAddress` only applies alongside `saveAddress`: an order-scoped row is
not in the address book to be defaulted to.

### Order totals are recomputed server-side

Checkout sends only variant IDs and quantities. The API recomputes every price, discount, shipping cost, surcharge and tax from the database. Nothing the browser believes about the total can influence what is charged. **Preserve this.**

The storefront mirrors the calculation for display only — and it must stay in sync, or checkout quotes one figure and charges another.

### `apiFetch` vs `apiFetchSafe` vs `apiFetchResource`

- `apiFetchSafe(path, fallback, opts)` — public **list** reads that must not fail a page render. Degrades to `fallback` when the API is unreachable or 404s.
- `apiFetchResource<T>(path, opts)` — a read where the resource **is** the page: `/products/[slug]`, `/shop/[category]`, `/blog/[slug]`. Returns `null` only when the resource is genuinely absent, and rethrows everything else so `error.tsx` handles it.
- `apiFetch(path, opts)` — anything the user initiated. A rejected submission must surface to the person who made it, not be swallowed.

**Trap:** because `apiFetchSafe` never throws, TanStack Query's `isError` never fires for it. A failed fetch looks like an empty result. Screens driven by `apiFetchSafe` need to distinguish "genuinely empty" from "did not load" some other way — see the wishlist and compare pages.

That trap is exactly why detail pages use `apiFetchResource` instead. `apiFetchSafe` collapses "this product does not exist" and "the API is down" into the same `null`, so during an outage every bookmarked product page tells the customer their product is gone — with a 404 status that invites search engines to drop the URL. **A missing resource is a 404; a broken backend is an error boundary.**

`apiFetchResource` also treats a 200 carrying `null` or `{}` as absent. A bare truthiness check hands `{}` to an adapter, which reads a field off `undefined` and crashes the server render — which the browser reports as a client-side exception, not a 404.

### Shop configuration lives in the `settings` table

Key/value, with `value_type`, `category`, `description`, `is_public`. **Not** a separate `shop_configurations` table — order totals are computed from these rows, so a parallel table would let the values staff edit drift from the values customers are charged.

Read config through `SettingsService.getNumber/getBoolean/getString`, never `prisma.setting` directly — that skips the cache and duplicates fallbacks.

`config-catalogue.ts` is a **seed list, not a schema**. Adding a config is an INSERT; nothing in code needs to change.

### Never hardcode a configured amount in the storefront

Shipping thresholds, shipping costs, COD fees, gift-wrap prices, tax and minimum order value are shop configuration. **No constant, no literal in a component, no number baked into a translation string.**

This is not a style rule. The storefront carried `FREE_SHIPPING_THRESHOLD = 5000` in `lib/utils.ts` while the API seeded `free_shipping_threshold = 299900` paisas, so the shipping policy page and the announcement bar promised free delivery over ₨5,000 while the cart, checkout and the invoice all applied ₨2,999. Six components and three message files each stated a figure of their own.

How to read one:

| Context | Source |
|---|---|
| Client component | `useShopSettings()` / `useFreeShippingThreshold()` (`lib/use-shop-settings.ts`) |
| Server component | `await fetchSettings()` — cached, `revalidate: 60` |
| Cart maths | `useCartStore(s => s.settings)` |

**Fetched once per page load** by `CartBootstrap` into the cart store. A component that calls `/settings/public` for itself is a round trip for an answer that cannot differ between callers.

Two further rules that follow from it:

- **Format with `formatPrice`**, never by hand. `cart-page-client.tsx` used `amountUntilFree.toLocaleString()` and rendered a bare number beside a cart drawer that showed the symbol.
- **A translation message takes `{amount}`; it never contains a figure.** `announce.freeShipping` held `<b>₨5,000</b>` in all three locales, so correcting the value meant editing three JSON files and hoping none was missed.

Fallbacks live in exactly one place: `CONFIG_FALLBACK` in `adapters.ts`, mirroring the seeded catalogue. `SETTINGS_FALLBACK` is derived as `adaptSettings({})` rather than written out, because a second hand-written copy in rupees is a second place to drift. `adapters.test.ts` pins those numbers to the seed.

Known exception: `app/[locale]/returns/page.tsx` quotes a ₨250–₨400 courier pickup range. That is a third-party charge the shop does not set and has no config key, so it stays prose.

### A menu item's href is built in the adapter, never in a component

The API returns *what* an item points at (`linkType` plus a slug or a URL). Route
shapes and the locale prefix are storefront facts, so `adaptMenuItem` in
`lib/api/adapters.ts` is the only place that turns one into a href — and the only
place that composes `rel`.

Same reasoning as `getDefaultVariant` and `adaptImages`: five surfaces render menu
items, and "which route does a `collection` go to" has to be one answer. The three
surfaces that once decided independently which variant represents a product
disagreed, and shipped a card advertising ₨1,199 that opened at ₨4,999.

`adaptMenuItem` returns `null` for an item that cannot produce a usable
destination — a `category` row with no slug, a `custom` row holding
`javascript:`. Dropping it is deliberate: the alternative is an anchor to
`/shop/undefined` in the header, and a dead control is worse than one link fewer.

### A staff-editable link field is an open redirect waiting to happen

`INTERNAL_PATH_REGEX` is mirrored in `apps/api/src/menus/menu-constants.ts` and
`apps/storefront/src/lib/menu-constants.ts`, and `menu-constants.test.ts` pins the
two to the same source string so they cannot drift silently.

Both exclusions are load-bearing. `//evil.example` reads as a path, passes
`startsWith('/')`, and the browser resolves it to another host — the hole
`safeNextPath` already closed on `?next=`. `/\evil.example` resolves *identically*,
because URL parsing for a special scheme normalises `\` to `/`, while sailing past
a `(?!\/)` lookahead. The API validates on write; the adapter re-checks, because
it is the boundary components trust and a row can predate a check.

### Menu audience is resolved server-side, never from a parameter

`visibility` (`everyone` / `guest` / `customer` / `retail` / `wholesale`) is
matched against an audience derived from the authenticated principal via
`OptionalJwtAuthGuard` and a `User.customerGroup` lookup — not from a query
string, which would put "wholesale only" one URL away from public.

The consequence is that a **server render is always the guest view**: it has to be
anonymous for the payload to be cached and shared, which is also the right thing
for a crawler to receive. `MenuProvider` re-fetches with the customer's token once
auth has hydrated. It waits on `isHydrating` for the same reason `RequireAuth`
does.

`device`, by contrast, is *not* filtered server-side. The viewport is a
client-side fact, so `device` ships in the payload and the storefront applies it —
by filtering where the container is itself viewport-scoped (`DesktopNav`,
`MobileNav`), and by a responsive class (`deviceClass`) where it is not (the
footer, a sidebar). Filtering the footer to one viewport made a `device: 'mobile'`
link invisible on every screen there is.

### Menu caching holds unfiltered rows

`menu:rows:<location>` caches the raw rows; audience and schedule filtering runs
per request. Caching the finished payload per (location, audience) would make
`publishUntil` inexact by up to the TTL — an item scheduled to stop at 23:59 would
keep rendering until the entry expired — and multiply the keys a write has to
invalidate. Filtering an already-loaded array is microseconds.

**A menu write must purge both caches.** The API's Redis entry is one; Next's
`fetch` cache in the storefront container is the other, and nothing in Redis can
reach it. `StorefrontRevalidationService` POSTs to `/api/revalidate-menus`, which
calls `revalidateTag('menus')`. It never throws — the write already succeeded, and
the change still lands at the TTL.

Absence is cached too, briefly: `sidebar` has no seeded row and the layout asks
for it on every render. **The marker is a sentinel object, not `null`** —
`cache-manager-redis-store` refuses to store `null` (its `isCacheable` default
throws on it) and `cacheSet` swallows the throw, so a cached `null` would appear
to work, do nothing on Redis, and function only on the in-memory fallback, i.e.
only while Redis was down.

`fetchMenu` passes `signal: null` to opt out of `apiFetch`'s default timeout,
because Next treats a `fetch` carrying an `AbortSignal` as uncacheable — which
would leave the `menus` tag attached to nothing.

---

---

## Features Implemented

### Catalogue
Products with tiered variants (Economy / Standard / Premium), multilingual names and descriptions, images, badges, tags, size guides, kit contents. Filtering, sorting, pagination, predictive search.

**Default variant selection** is centralised in `getDefaultVariant()` (`lib/utils.ts`): cheapest in stock, falling back to cheapest overall. The product card, the product page and add-to-cart must all use it. They previously decided independently, and with the API returning variants unordered, a card could advertise ₨1,199, open at ₨4,999, and add ₨4,999 to the basket. The API now also returns variants `orderBy: { price: 'asc' }`.

**Product SEO is per-locale.** `products` carries `seoTitleEn/Ur/Ar`, `seoDescEn/Ur/Ar` and `seoKeywordsEn/Ur/Ar`, flat columns mirroring `nameEn/Ur/Ar` and the identical block on `categories`. Before `20260808100000_product_locale_seo` there was only a single `metaTitle`/`metaDesc` pair, so an Urdu or Arabic product page could only ever be indexed under its English title.

The old pair is kept, not dropped — dropping a column is not reversible against a populated table — and the admin form writes it from the English SEO values on save rather than offering it as a separate box, so the two cannot drift. The migration backfills the English pair from it.

On the storefront the fields resolve through `localisedOptional()` in `adapters.ts`, the deliberate counterpart to `localised()`: it returns `undefined` rather than `''` for a locale nobody wrote, because `generateMetadata` does `seoTitle?.[locale] ?? name` and an empty string would win that `??` and ship a blank `<title>`. English backs the other two locales, so an English-only SEO title is used everywhere rather than nowhere. An authored title is emitted as `title: { absolute }` — it already ends in the brand, and going through the layout's `%s | Yala Haji` template would ship the brand twice. Authored keywords **replace** the derived tag/category/site-wide list rather than joining it.

Every SEO field on `ProductInput` is `string | null`, not merely optional: a PATCH has to distinguish "leave alone" (key absent) from "clear it" (`null`), and `JSON.stringify` drops `undefined`. Mapping a cleared input to `undefined` is what made fifteen menu-admin fields set-once.

### Category management
Unlimited-depth category tree (parent/child via a self-relation, no depth cap enforced anywhere — `findAll`/`findAllAdmin` fetch flat and group by `parentId` in memory rather than nesting Prisma `include`s, which silently truncated past two levels). Per-category tree thumbnail and a separate wide banner image (for the shop category page header), featured flag, per-locale SEO title/description mirroring the existing `nameEn/Ur/Ar` flat-column convention rather than a translation table.

The admin screen (`apps/admin/src/app/(dashboard)/categories`) is a single tree view: native HTML5 drag-and-drop for reparenting and reordering (optimistic update, rollback on failure, blocked-drop feedback while dragging over a node's own subtree), search/status/featured filtering that keeps a matching row's ancestors visible, and bulk enable/disable/delete. `GET /categories` (public, active-only) and `GET /categories/admin/tree` (guarded, every status plus a product count) are deliberately separate endpoints rather than one route with an `includeInactive` flag — the public route carries no guard, so a flag would let anyone crawl categories staff have deliberately hidden, the same reasoning behind `/products/admin/list`.

**Soft delete, not a real row delete.** `DELETE /categories/:id` sets `isActive: false` (mirroring `ProductsService.remove`) and refuses with a 409 while the category still has subcategories or assigned products — `Product.categoryId` and the parent self-relation both default to Prisma's `RESTRICT`, so a real delete would previously have thrown a raw foreign-key 500, and a category with children but no products would have hit that same `RESTRICT` while `KitCategorySource.categoryId` (which does cascade) silently dropped its link in the same statement.

**Circular hierarchy is guarded server-side**, not just prevented by the drag-and-drop UI: `assertNotCircular` walks a proposed parent's chain up to the root before every parent change (`update`, `reorder`), rejecting a move that would nest a category inside its own descendant.

Not built: reindexing category changes into a search index. No search index (Meilisearch or similar) exists anywhere in this codebase yet.

### Product media
Staff upload photos from the product form (`components/products/media-manager.tsx`). Files go straight to MinIO via `POST /media/upload` on selection; only the returned URL is held in form state, so the product payload stays JSON.

`POST /media/upload` accepts JPEG, PNG, WebP and AVIF up to 10 MB, re-encodes everything to WebP at 1200px wide, and writes into one of the four folders in `MEDIA_FOLDERS`. The folder is an **allowlist, not a sanitiser** — it arrives as a form field and is concatenated into the object key, so `../` would otherwise write outside the prefix. `DELETE /media` refuses any URL that is not under the configured public base, for the same reason.

The declared MIME type is checked, but sharp failing to decode is what actually decides a file is not an image — a browser's `Content-Type` is a claim, not evidence.

**Exactly one image is primary.** `normaliseMedia()` in `products.service.ts` enforces this on every write: it promotes the first image when none is flagged, demotes extras when several are, and renumbers `order` from array position. Two queries depend on it — the cart's product select and the kit-contents select both use `where: { isPrimary: true }, take: 1`, so a product with no primary contributes no image at all and the customer reviews their basket against placeholders.

Removing a photo in the admin panel deletes the stored object immediately, before the form is saved. The confirm dialog says so; cancelling the form afterwards does not bring it back.

### Cart
Guest carts keyed by `X-Session-Id`, issued by `POST /cart/session` — unsigned IDs are rejected, so a caller cannot invent one and read someone else's cart. Signing in merges the guest cart into the account's.

### Checkout and orders
Guest and authenticated checkout. Order numbers are `YH-<year>-<n>-<token>` — sequence from 1001, derived inside the transaction with retry on unique-constraint collision (a `count()+1` scheme produced duplicates under concurrent checkout and drifted across year boundaries), plus a six-character random token.

**The token is a credential, not decoration.** See *Order tracking* below.

### Order tracking
Public, by order number alone: `POST /orders/track` with `{ number }`. No email or phone.

That is only safe because of the token, and the two facts have to be maintained together:

- **The token must stay random and `crypto`-sourced** (`randomOrderToken` in `orders.service.ts`). The sequence half is walkable by hand; when the number alone was accepted against a purely sequential scheme, `YH-2026-1001`, `1002`, … dumped the order table.
- **The tracking response must stay narrow.** Status, timeline, items, shipping method, total, courier tracking number. No address, no name, no email or phone, no coupon or payment data. Someone who finds a number on a forwarded screenshot should learn where the parcel is, not where the customer lives.

Throttled at 5/minute. POST rather than GET so the number stays out of URLs, browser history, access logs and `Referer` headers.

The number format is validated in two mirrored places — `ORDER_NUMBER_REGEX` in `apps/api/src/orders/dto/track-order.dto.ts` and in `apps/storefront/src/lib/validation.ts`. The alphabet is Crockford Base32, so `I`, `L`, `O` and `U` are deliberately absent.

### My Orders
Server-side paginated (`GET /orders`, 10 per page, newest first), with per-order
payment status, a fulfilment state **derived from `OrderStatus`** rather than
stored, shipping method, courier tracking number, item count and reorder.

There is no `fulfilmentStatus` column and no courier model: one warehouse, no
carrier integration, no partial shipments. A second status field would have to
be maintained by hand alongside the first and would be wrong the first time
somebody forgot. `fulfilmentState()` in `lib/order-status.ts` is the single
place that derives it, and the single place that would start reading a real
shipment model if the enterprise-OMS work in `TASKS.md` ever lands.

`FULFILMENT_STEPS` mirrors the forward path of `ORDER_STATUS_FLOW` in
`orders.service.ts` — **change one, change both**, or a customer's live order
renders as sitting at a step that no longer exists. `cancelled` and `refunded`
are deliberately absent from it: they are exits from the track, not points
along it, so a terminal order gets its real history instead of a progress bar
pointing at a delivery that will never come.

Payment status is rendered as its own badge, never merged into the fulfilment
one. A COD order is `delivered` and `unpaid` for as long as it takes the courier
to remit the cash, and one combined badge told customers their delivered order
was unpaid — which reads as a demand for money they have already handed over.

### Saved addresses and checkout autofill
`Home`/`Office`/`Other` label chips backed by the `labelType` enum, `area`,
`country`, optional per-address `email` (the recipient is not always the account
holder), and separate shipping and billing default flags.

A signed-in customer's default address is prefilled on arrival at checkout, with
a picker above the form, a Change Address panel behind it, and an Add New
Address dialog that saves to the account without leaving the page. The whole
address list arrives with the checkout page load and is held in one TanStack
Query cache, so switching between addresses is a state change, not a round trip.

**`AddressForm` is one component serving three surfaces** — create, edit, and
checkout's add-new. A second address form in the checkout tree would be a second
place for the field list and the validation wiring to drift, and the one that
drifts is always the one nobody is looking at.

An unedited saved address is sent as `addressId`; anything typed or edited is
sent inline. Typing over a prefilled address clears `selectedAddressId`, so the
edit applies to that order only and the saved row is left alone.

Guests see no picker and no save-to-account tickbox — there is no account behind
either, and an empty picker urging them to sign in turns a working guest
checkout into a nag at the worst possible moment.

`formatAddressLines` in `lib/address.ts` is the single definition of how an
address renders. Five surfaces show one, and they had each assembled their own
subset — the visible symptom was `area` appearing on some screens and not
others, which reads to a customer as data that has been lost.

**Clearing an optional field sends `null`, not `undefined`.** `addressLine2`,
`area`, `postalCode` and `email` on `AddressInput` are `string | null`, wider
than `Address`'s `string | undefined`, because `updateAddress` PATCHes and the
API treats an omitted key as "leave alone" — the same rule `MenuItemInput`
already follows. `AddressForm` used to send `undefined` for an emptied field;
`apiFetch` bodies go through `JSON.stringify`, which drops a key whose value
is `undefined`, so the PATCH never carried the field and the old value stayed
in the database — invisible until the address list was refetched and the
"cleared" field reappeared. `CreateAddressDto`'s matching fields are typed
`string | null` for the same reason; `@IsOptional()` already tolerated `null`
before this fix, it just never received one.

### Returns
Customer-facing half: eligible orders, request creation, own-request listing. 7-day window from the recorded delivery timeline entry. Admin moderation is built — `PATCH /returns/admin/:id/status` with a server-enforced transition flow (`RETURN_STATUS_FLOW`: requested → approved/rejected → received → refunded), plus the admin queue screen with a status filter.

### Admin order management
The admin order screen supports server-side filtering (status, payment status, payment/shipping method, date range, total range, city/province, and a search across number, tracking, name, email and phone), allowlisted sorting, a bounded CSV export of the current view (`GET /orders/admin/export`), and bulk status change (`POST /orders/admin/bulk-status`, which skips orders whose current status cannot legally move). Tracking numbers are assigned via `PATCH /orders/:id/tracking`; payment status is moved by hand via `PATCH /orders/:id/payment-status` (how a COD order becomes `paid` on collection, since no gateway callback exists). The admin and API money/type/status shapes are mirrors — the `OrderStatus`, `ShippingMethod` and address field names in `apps/admin` must match the Prisma schema exactly, a drift that previously shipped a blank shipping block and an unreachable status.

### Reviews
Submission requires a signed-in customer; reviews appear publicly only after moderation. Admin queue endpoint is pending.

### Kit builder
`KitCategory` + `KitCategorySource` — a kit step is a merchandising grouping that can draw on several catalogue categories at once, with its own ordering, icon and required flag. Deliberately not a `Category`.

### Shop configuration
Key/value config with Redis caching, typed reads, admin CRUD, and a public endpoint driven by `is_public`. The admin panel's **Store Settings** screen (`apps/admin/src/app/(dashboard)/settings`) reads and writes it through `GET/POST/PATCH/DELETE /settings*`: settings are grouped into pill-filtered sections by `category`, the value editor renders per `valueType` (text / number / boolean toggle / JSON textarea), and `isPublic` is an explicit checkbox rather than implied by anything else. Write access mirrors the API guard — `admin` and `manager` can create/edit, only `admin` can delete — enforced both server-side and by hiding the controls client-side (`RequireRole`, `canManage`).

### Audit log
`AuditLog` (`apps/api/src/audit-log`) is a generic, append-only trail — `entityType`/`entityId` are free text rather than an enum, so a new caller needs no migration, only a new value. `AuditLogService.record()` never throws: a write that succeeded but couldn't be logged is still a write that succeeded, so a logging failure is reported to the error log rather than failing the request. `GET /audit-logs` (admin/manager) lists it, optionally narrowed to one entity.

`SettingsService.create/update/remove` are the first caller — `actor` (id, name, role, IP) is now a required parameter, resolved in `SettingsController` from `@CurrentUser()` and `req.ip`, and every write records a before/after snapshot. The admin Store Settings screen surfaces this per row and in aggregate via a "History" panel.

### Navigation menus
Header, footer, mobile drawer and sidebar navigation is rendered from the
database, as are the mega panels that hang off a header item. (`MenuLocation`
also has a `mega` value for a standalone mega menu; nothing mounts one yet — a
mega *panel* comes from a header item's `isMegaMenu` flag, not from that
location.) `Menu` (one row per `MenuLocation`, `location` UNIQUE) plus
`MenuItem.parentId`, a self-relation with no depth cap, mirroring `Category`. As
there, the tree is assembled in memory from one flat SELECT rather than by nested
Prisma `include`s, which silently truncate.

`linkType` discriminates what an item points at — `category`, `product`,
`cms_page`, `brand`, `collection`, `custom` (internal path), `external`, and
`heading` (a label with children and no destination). Each item also carries
per-locale titles, badges and `title` attributes, an icon and image, `visibility`,
`device`, a `publishFrom`/`publishUntil` window, the SEO trio
(`relAttribute`/`noFollow`/`openInNewTab`), and — when `isMegaMenu` — a layout, a
column count and a `megaConfig` JSON blob holding featured slugs, a banner and
content blocks.

Public reads: `GET /menus/header`, `/footer`, `/mobile`, `/location/:location`,
`/:id/items`. Admin CRUD and reorder under `/menus` and `/menus/admin/*`, guarded
by `STAFF_MANAGE` and audit-logged. `POST /menus/admin/publish` is guarded but not
logged — it only purges caches, and every write that changes something is already
logged by the mutation itself. `src/menus/default-menus.ts` is a
**seed list, not a schema**, holding the navigation that used to be hardcoded.

The storefront layout fetches every menu once and shares them through
`MenuProvider`; `components/navigation/*` renders them. Staff edit them from the
admin **Menus** screen (`apps/admin/src/app/(dashboard)/menus`) — one drag-and-drop
tree per location, following the categories pattern, against
`POST /menus/admin/reorder`.

Two rules that screen exists to respect, and that broke when it did not: a PATCH
distinguishes an **omitted** key ("leave alone") from **`null`** ("clear it"), so
every optional field in `MenuItemInput` is nullable and a cleared input maps to
`null` — mapping it to `undefined` made fifteen fields set-once. And `megaConfig`
is only sent when the admin actually edited it, because the API normalises on read
(capping lists, dropping unknown keys), so re-sending an untouched config would
write the trimmed version back. No navigation array
remains in `header.tsx`, `mega-menu.tsx` (deleted) or `footer.tsx`. The exceptions,
recorded in TASKS.md rather than left implicit, are the account sidebar, the mobile
bottom bar and the header's utility links — auth-guarded chrome whose existence is
decided by code, not by merchandising.

### Also built
Coupons, blog with category filtering, wishlist, saved addresses, profile, stock notifications, media upload, admin products and orders.

---

## Business Rules

### Guest checkout
- Enabled by default, controlled by `guest_checkout_enabled` and **enforced server-side** — an admin toggle that only hides UI is decorative. The checkout UI also reads it, so a guest is asked to sign in before filling in an address rather than after.
- A guest order **must** carry a phone or email. Not for tracking — the order number carries its own token now — but because a COD courier needs a number to call and support has no way to reach the buyer about a failed delivery without one.
- Guest addresses are persisted with `userId = NULL` and exist only to be referenced by their order.

### Authentication required for
My Orders, Wishlist, Saved Addresses, Profile, Returns, review submission.

Enforced in two places, deliberately:

- **The API is the boundary.** Every one of those routes carries `JwtAuthGuard` and scopes by `userId`.
- **`RequireAuth` is the experience** (`components/auth/require-auth.tsx`). The customer token lives in `localStorage`, which middleware cannot read, so no server-side guard is possible for these routes — and none is needed, because the API already refuses. What the component fixes is a signed-out visitor reaching `/account/orders` and being shown a generic "could not load" panel with a Retry button that could never succeed.

`RequireAuth` must wait on `isHydrating`. The persisted auth store starts at `user: null` and confirms the token asynchronously, so redirecting on `!user` alone throws valid sessions out on every hard refresh.

`/account` itself is **not** guarded: a signed-out visitor gets the guest dashboard there. Someone who checked out as a guest has a real reason to be on that page and no account to sign in to.

### The wishlist is server-side
`/users/me/wishlist`, via `store/wishlist.ts`. It was previously a `persist`ed Zustand store in `localStorage` while the API endpoints sat unused — the two disagreed about what a wishlist was, and the local version lost a customer's saved items on a device change, silently.

Guests do not get a local wishlist. The heart icon sends them to sign in, through `useWishlistToggle`, which is the single definition of what that control does on every surface. `LEGACY_KEY` in the store exists only to adopt ids already stranded on a device at first sign-in; nothing writes to it.

Sign-out clears the in-memory list — otherwise one customer's saved items show to whoever signs in next on a shared phone.

### Orders
- Minimum one line item; maximum 50; maximum 99 per line.
- The same variant cannot appear twice — each line passes the per-line stock check while together exceeding stock.
- `min_order_amount` checked against the discounted subtotal. `0` means no minimum.
- Cancellable by the customer only while `pending` or `confirmed`.
- **Status transitions are enforced server-side** by `ORDER_STATUS_FLOW` in `orders.service.ts`, not only narrowed in the admin dropdown. The forward path is pending → confirmed → processing → packed → shipped → out_for_delivery → delivered; `cancelled` is reachable up to and including `packed`; `delivered → refunded` is the only move out of delivered. `cancelled` and `refunded` are terminal. The admin's `nextStatuses` mirrors this map — change one, change both.

### Payments
**Cash on Delivery is the only selectable method.** JazzCash, Easypaisa and card are shown greyed out as *Coming Soon* — no gateway exists, and offering them produced orders that looked paid to the customer and unpaid to fulfilment. **Bank transfer is not supported and not planned.**

Enforced on both sides: `CreateOrderDto` validates with `@IsIn(ENABLED_PAYMENT_METHODS)`, not against the whole enum.

The `PaymentMethod` enum and both TypeScript unions keep all five values deliberately — historical orders may hold a disabled method, and admin screens must still render them.

### Shipping and pricing
- Free above `free_shipping_threshold`; otherwise `standard_shipping_cost` or `express_shipping_cost`.
- `cod_fee` is added for COD orders and rides on the `shippingCost` column.
- `tax_percentage` applies to goods only, not shipping or the COD surcharge.

### Returns
- Delivered orders only, within 7 days of the delivery timeline entry.
- One open request per order (`requested`, `approved`, `received` block a new one; `rejected` does not).

### Configuration
- `is_public` defaults to **false** — a new key is private until deliberately published. This is what stops an innocently-named credential reaching a public payload.
- Missing or corrupt config falls back rather than erroring. A `free_shipping_threshold` coerced to `0` would silently make all shipping free.

---

## API Standards

### Validation
Global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`, `enableImplicitConversion`.

Consequences to respect:

- **A DTO must be a class with decorators.** An inline type literal (`@Body() body: { code: string }`) is erased at compile time, so the pipe validates nothing. This has bitten this codebase twice.
- **`PartialType()`, never `Partial<>`.** The TypeScript utility is erased, leaving no metadata — whitelisting stops applying and every field passes through unchecked.
- **`@IsString()` accepts `""`.** Required string fields need `@IsNotEmpty()` too. Blank recipient names and empty phone numbers reached the orders table this way.
- Length caps on every free-text field, sized to the column.

Shared constants live in `apps/api/src/common/validation.ts` and mirror `apps/storefront/src/lib/validation.ts`. **Change one, change both** — a storefront rule looser than the API's produces a rejection the customer was never warned about.

### Responses
Paginated endpoints return `{ items, meta: { total, page, limit, totalPages } }`.

Errors are Nest's standard shape; the storefront's `extractMessage` flattens `message: string | string[]`.

### Route ordering
Static paths must be declared **before** parameterised ones. Nest matches in declaration order, so `@Get(':slug')` above `@Get('categories')` swallows it.

### Authentication
Every non-public route carries an explicit guard. Public routes are the deliberate exception and should be obvious: catalogue reads, `GET /settings/public`, `POST /orders/track/:number`, `POST /cart/session`.

Ownership is enforced by scoping the query (`where: { id, userId }`), so a guessed ID from another account reads as 404 rather than confirming the resource exists.

### Caching
`AppCacheModule` — Redis, **falling back to in-memory rather than failing to boot**. A cache is an optimisation; refusing to start because Redis is down turns a degraded dependency into an outage.

Cache access is wrapped so it can never be why a request fails. A write must invalidate the single key *and* any aggregate (`config:public`, `config:all`), or an admin sees their own edit apparently do nothing.

---

## UI/UX Standards

### Forms
`FormField` (`components/ui/form-field.tsx`) wires label, control and error together for screen readers and reserves the error line so layout does not jump between keystrokes.

Validation pattern: errors appear on **first submit**, then live-validate as the user corrects. Show every failing field at once — walking someone through errors one at a time turns a five-field form into five round trips. Move focus to the first invalid field.

Rules come from `lib/validation.ts`. `required` trims first: a field of spaces satisfies a browser's `required` attribute but is not an answer.

### Loading, error and empty states
Every API-backed view needs all four: pending, error (with retry), empty, and populated. Distinguish "empty" from "failed to load" — telling someone their wishlist is empty when the catalogue simply did not load suggests their saved items are gone.

### 404 and error boundaries

Four files, and the reason each exists is different:

| File | Covers |
|---|---|
| `app/[locale]/not-found.tsx` | Every 404 inside the locale tree. Renders `NotFoundView` with header, footer and i18n. |
| `app/[locale]/[...rest]/page.tsx` | Catch-all that calls `notFound()`, so an unmatched URL *reaches* the boundary above. |
| `app/[locale]/error.tsx` | Runtime failures — an unreachable API, a bug. Not missing resources. |
| `app/not-found.tsx`, `app/global-error.tsx` | The two cases that render outside `[locale]/layout.tsx`. |

**The catch-all is not optional.** `app/layout.tsx` renders bare `children` — `[locale]/layout.tsx` owns `<html>` and `<body>` so it can set `lang` and `dir`. An unmatched path is resolved *before* Next enters the `[locale]` segment, so it rendered the global `not-found` under a root layout that emits no document element and no `NextIntlClientProvider`. The result was an unhydratable page and `Application error: a client-side exception has occurred` in place of a 404. Making the URL match `[...rest]` puts it inside the locale layout, where the boundary has everything it needs.

For the same reason, **`app/not-found.tsx` and `app/global-error.tsx` render their own `<html>` and `<body>`** and depend on no provider. They are reached precisely when the locale layout is not available — an invalid locale, or a failure in the layout itself. A fragment there reintroduces the original bug.

`notFound()` sets HTTP 404 regardless of which file renders; the status does not come from the filename. `not-found.tsx` cannot export `metadata`, so the noindex tag is rendered in `NotFoundView` (React 19 hoists it into `<head>`).

### Honesty
No placeholder fallbacks that look like real data. Checkout once rendered `address.fullName || 'Muhammad Ali'`, so an empty form displayed a plausible delivery address. No dead controls — a button with no handler is worse than no button.

### Internationalisation
Three locales: `en`, `ur`, `ar`. All customer-facing strings go through next-intl.

**Never cast a translation key** (`t('foo' as never)`). The cast defeats the type check, and next-intl returns the key path for a miss rather than `null` — so `?? 'fallback'` is dead code and the literal `cart.freeShipping` ships to customers. This has happened.

RTL matters: use logical properties (`ms-`, `me-`, `start-`, `end-`), not `ml-`/`mr-`/`left-`/`right-`.

---

## Development Standards

### Folder structure

```
apps/api/src/
  <feature>/
    <feature>.controller.ts
    <feature>.service.ts
    <feature>.module.ts
    <feature>.service.spec.ts
    dto/
  common/          cross-cutting constants (validation, payment-methods)
  auth/            guards, strategies, decorators
  prisma/

apps/storefront/src/
  app/[locale]/    routes
  components/      grouped by feature, plus ui/ for primitives
  lib/             api/ (client, adapters, per-domain modules), utils, validation
  store/           Zustand stores
  i18n/messages/   en.json, ur.json, ar.json
  data/            curated editorial content ONLY — not a mock-data folder
```

### Naming
- Config keys: `lower_snake_case`, enforced by regex in the DTO. These are read by name across two frontends, and `freeShipping` vs `free_shipping` is a silent miss that falls through to a default instead of erroring.
- Slugs: `lowercase-with-hyphens`, enforced by regex.
- Prisma models PascalCase, tables `@@map`ped to snake_case plural.

### Reusable components
Before adding a form control, price display or state panel, check whether one exists. Storefront: `ui/form-field`, `ui/safe-image`, `ui/product-image`, `ui/page-loader`. Admin: `ui/{panel,field,button,toast,pagination,confirm-dialog,stat-card}` and `RequireRole`.

### Tests
- API: `npm test` in `apps/api` (Jest). Services are tested against a Prisma double that throws if the code reaches it when it should have failed a guard first.
- Storefront: `npm test` in `apps/storefront` (Vitest). Pure logic — validation rules, adapters, variant selection.

Test the business rule, not the implementation. Each test names the failure it prevents.

### Migrations
Hand-written SQL under `prisma/migrations/<timestamp>_<name>/migration.sql`, with a comment block explaining *why* the change is being made. Additions must be nullable or defaulted so existing rows survive. Backfill in the same migration when a new column changes behaviour.

---

## Important Decisions

Recorded so they are not relitigated.

### The homepage engine is a sibling of the menu system, not a new pattern

`HOMEPAGE_ENGINE_AUDIT.md` records the full audit. The conclusion, so it is not
re-derived: the homepage is currently seven components hardcoded into
`app/[locale]/page.tsx`, five of which own their own copy, and nothing in the platform
models a page, a section, a banner, a collection or a CMS page. `MenuLinkType` already
carries `collection`, `cms_page` and `brand` as enum values with no table behind them.

The section model to build follows `MenuItem` field-for-field — flat per-locale
columns, `order`, `isActive`, `publishFrom`/`publishUntil`, and a JSON config
normalised and capped server-side — served through a per-key cache with explicit
invalidation on write and a storefront revalidation ping. The alternative considered
was a general page builder with free-form blocks. Rejected: the menu system already
proves this shape works in this codebase, staff already know its admin screen, and a
second block vocabulary would be a second thing to keep in sync with the storefront's
component list.

Concretely, that means "Before Umrah", "Build Your Own Umrah Kit", "Under PKR 1,000"
and "Crafted for the Conscious Pilgrim" are rows in the YalaHaji database, and the
same engine serves a fashion or grocery store with different rows and no source
changes.

### `ProductQueryDto.minPrice`/`maxPrice` are rupees, not paisas

Noted here because it contradicts the money rule everywhere else in this document.
`products.service.ts` multiplies both by 100 before querying. Every other money field
in the API — order totals, coupon subtotal, all shipping settings — is paisas. Anything
built against `/products` for price filtering must send rupees; anything built against
`/orders`, `/coupons/validate` or `/settings` must send paisas. This is a trap, not a
convention, and the homepage "shop by budget" work should resolve it rather than
work around it.

### Shop config extends `settings`; no `shop_configurations` table
A second config table would let the values staff edit drift from the values customers are charged against, with nothing to signal it. The existing table was extended with metadata columns instead.

### `is_public` column, not a hardcoded allowlist
The previous allowlist in `settings.service.ts` meant every new customer-facing config needed a code change, and any key an admin added was invisible to it rather than deliberately withheld.

### Disabled payment methods stay in the enum
Removing `bank_transfer` or `jazzcash` would need a migration that fails against any historical row holding it, and admin screens must still render those orders. Availability is controlled by the two `payment-methods.ts` allowlists, not by the enum.

### Redis falls back to in-memory
Availability beats cache coherence for this workload. The fallback is per-instance, so invalidation will not propagate across replicas — hence the warning log, which is the signal to fix Redis.

### The primary image is resolved in the adapter, not at each call site
`adaptImages()` in `lib/api/adapters.ts` sorts the primary photo first, so every surface that reads `images[0]` — product card, compare page and bar, kit builder, detail gallery — honours the flag without knowing it exists.

The alternative was a `find(i => i.isPrimary) ?? images[0]` at each of the six call sites. Rejected: it is the same rule written six times, and the seventh surface added later would be written from the example of whichever one the author happened to copy. The adapter boundary already exists to reconcile the API's shape with what components expect, which is exactly what this is.

Products whose photos predate the flag have no primary at all. Those keep their `order` untouched rather than having one invented, because `order` is then the only signal there is.

### Removing a product photo deletes the file immediately
Considered detaching only, leaving the object in MinIO. Rejected: orphaned files accumulate with nothing to reconcile them against, and storage that only ever grows is a cost nobody notices until it is large.

The cost is that removal is not transactional with the form — cancelling after removing leaves the file gone. The confirm dialog states this outright rather than implying the change is pending. If the delete call fails the photo is still detached from the product, because a failure to tidy storage is not a reason to keep showing an image staff asked to remove.

### `getDefaultVariant` is the single definition of "which variant represents this product"
Three surfaces previously decided independently and disagreed. Anything showing a product price must use it.

### Tracking is by order number alone, so the number carries a random token
The alternative — number plus the email or phone the order was placed with — was one field more for the customer and needed no schema change. It was rejected because the number is the thing people actually keep; the contact detail is the thing they guess wrong, especially when a relative placed the order. Moving the secret into the number keeps the lookup to a single field without making it enumerable.

The cost is a migration that rewrote every historical order number, and a number that is longer to read aloud.

### There is no `returned` order status; `refunded` is terminal
The admin once carried a `returned` value in its `OrderStatus` union that the Prisma enum never had, so choosing it produced a 400 from the status endpoint. Rather than add the enum value, a physical return is modelled where it belongs — the `Return` record and its own `ReturnStatus` lifecycle — and the order moves to `refunded` when a refund is issued. Keeping return state out of `OrderStatus` avoids conflating "the parcel came back" with "money went out", which are separate events with separate approvals.

### The order address is copied onto `orders` as columns

Considered three shapes. **Cloning the `Address` row per order** was rejected
because it leaves a row per order in a table the customer's address book also
reads from, distinguishable only by `userId IS NULL`. **A JSON snapshot column**
was rejected because the admin order list filters on city and province, and
those filters would have moved from an indexed relation to an unindexed JSON
extraction.

Real columns let that filter move onto `orders` unchanged, and made the filter
*more* correct on the way: staff searching "Lahore" want the orders that were
**sent** to Lahore, not the orders whose customer happens to live there now.

The cost is ten columns on a wide table and a backfill that has to run in the
same migration as the code change — deploying the code first would blank the
delivery address on every historical order at the moment the storefront started
preferring the snapshot.

### Billing addresses are out of scope while the shop is COD-only

No `isDefaultBilling`, no billing selector, no billing snapshot. Cash on
delivery is the only enabled payment method, so a billing address would be a
field with no consumer, collected from every customer, stored forever. It
belongs with the payment-gateway work in `TASKS.md`, which is where the first
thing that actually needs it will appear.

### The wishlist requires an account
Considered keeping it device-local for guests and syncing on sign-in. Rejected: a wishlist that silently disappears when someone clears their browser or picks up a different phone is worse than one that asks for an account first, and the "saved" state was a promise the local version could not keep.

### `safeNextPath` validates `?next=` rather than trusting it
The post-login destination comes from the query string, so it is attacker-controlled. A bare `router.push(next)` turns the sign-in form into an open redirect — one hop from a real login page to a convincing fake one. Protocol-relative (`//host`) and encoded variants are rejected specifically; they are the ones that look like paths.

### Testimonials remain static
Curated marketing copy with signed-off wording that changes a few times a year, and no admin surface. `src/data/testimonials.ts` is editorial content, not a placeholder. The other six files in that directory were mock-data stand-ins and have been deleted.

### The COD surcharge rides on `shippingCost`
It is a delivery-related charge and the column already exists, so it needs no migration to become visible on the order.

### Storefront and API validation are intentional mirrors
Not duplication for its own sake: the storefront copy catches a bad value before a round trip, the API copy is what protects the database. Neither can be removed.

### The audit log is one generic table, not one per entity
`entityType` is a plain string column rather than a Prisma enum or a separate table per feature. An enum would need a migration every time a new mutation started logging; a table per entity would mean the admin "who changed this" screen has to know which table to query before it can ask. The cost is that `before`/`after` are untyped `Json?` — acceptable, because the reader is a human looking at a diff, not code branching on the shape.

### Menus are their own tables, not `Setting` rows and not `Category`

A menu is an ordered, nestable list whose items each carry a link target, a
schedule, an audience and a layout. A key/value store can hold that only as one
opaque JSON blob that nothing can reorder, validate or query — the same reasoning
that kept the footer out of `settings` in the first place.

Not `Category` either, even though most items point at one: an item can point at a
product, a CMS page, a brand, a collection or an arbitrary URL, and the same
category can appear in several menus at different depths. Merchandising order is
not catalogue structure.

### `heading` is a link type, not a `custom` link to `#`

The alternative staff reach for is `custom` with `#`, which renders a real anchor
that jumps to the top of the page when clicked and is announced to a screen reader
as a link to nowhere. A footer column title is a label; the schema says so.

### Deleting a menu item deletes its subtree

`ON DELETE CASCADE` on `menu_items.parent_id`. `SET NULL` would silently promote
every orphaned child to a top-level nav entry, so removing an "Ihram" dropdown
would scatter its six children across the header. `RESTRICT` — Prisma's default —
would refuse with a raw foreign-key 500.

A **menu** row, by contrast, is a real delete rather than a soft one, unlike
`CategoriesService.remove`. Nothing references a menu, and `isActive` already
covers "switch it off but keep it".

### `User.customerGroup` exists so the wholesale/retail visibility rules are real

Added rather than storing the enum values and leaving them inert. A visibility
option an admin can select that never matches anyone is a dead control. It is NOT
settable from the customer signup flow — staff assign it — and it is read from the
database per request rather than carried on the JWT, so moving a customer to
wholesale takes effect on their next page load instead of at their next login.

### `AuditActor` is a required parameter, not inferred from a request-scoped provider
`SettingsService.create/update/remove` take `actor: AuditActor` explicitly rather than pulling the current admin from a NestJS request-scoped injection. Request-scoped providers make every consumer of that provider request-scoped too, which is a performance cost (a new instance per request) paid by the whole dependency graph for a value only mutations need. The explicit parameter also makes "which caller forgot to pass an actor" a compile error instead of a runtime `undefined`.

### The WooCommerce catalogue is a migration, not a seed script

`20260808110000_catalogue_import` inserts 28 products, their variants, tags,
badges and trilingual SEO. It is launch data the storefront cannot function
without, so it travels with the schema rather than depending on a script
someone remembers to run per environment. Ids are UUID v5 derived from the SKU
and every INSERT carries `ON DUPLICATE KEY UPDATE`, so re-application converges
rather than duplicating.

Two of the CSV's SKUs — `YH-IHR-MEN-001` and `YH-FRG-OUD-001` — are already used
by demo products in `prisma/seed.ts`. `products.sku` is UNIQUE, so those rows are
**updated in place** rather than inserted alongside. Their stale variants are
deactivated rather than deleted (`order_items` references them), and their demo
photos and size guide are removed because they depict a different product. Their
`avgRating`/`reviewCount`/`soldCount` are left alone — not CSV fields, and on a
live row they may reflect real reviews.

The migration also inserts the seed's own categories insert-only, so it does not
silently depend on `prisma db seed` having run first: `products.categoryId` is
NOT NULL behind a RESTRICT foreign key, so a missing category is a hard failure
mid-import, not a degraded one.

### The CSV's `Abaya` and `Hijab` are children of `abaya-hijab`, not siblings

The import created `abaya` and `hijab` beneath the existing `abaya-hijab` rather
than as two more top-level categories, which would have left three near-identical
entries in the shop nav. `gifts` and `travel-accessories` are new top-level
categories (`order` 7 and 8). Ajwa dates and Zamzam are filed under `gifts` as a
merchandising decision; the pre-existing `dates-zamzam` is untouched.

---

## Environment

`.env` at the repo root, loaded by the API via `ConfigModule` (`envFilePath: '../../.env'`).

Required: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_JWT_SECRET` (must differ), `REDIS_HOST`, `REDIS_PORT`, `STOREFRONT_URL`, `ADMIN_URL`, `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL`.

Optional: `MENU_REVALIDATE_SECRET` (shared by both apps — unset means menu changes
appear at the cache TTL rather than immediately, which is a supported state) and
`INTERNAL_STOREFRONT_URL` (where the API reaches the storefront to send that call;
inside Docker it should stay on the compose network rather than going out through
nginx and back, same as `INTERNAL_API_URL`).

`NEXT_PUBLIC_API_URL` is inlined at build time and must be passed as a Docker **build arg**, not only as a runtime environment variable.

After pulling schema changes:

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed     # insert-only; never overwrites existing config
```
