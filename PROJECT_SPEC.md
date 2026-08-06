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

---

## Critical conventions

These are the ones that cause real bugs when broken.

### Money is stored in paisas

The API stores, computes and returns **paisas** (1 rupee = 100 paisas) everywhere. The storefront converts to **rupees at the adapter boundary** via `paisasToRupees` / `rupeesToPaisas` in `lib/api/adapters.ts`.

A component that divides by 100 itself is a component that will one day forget. Never convert outside the adapter layer.

Exception to watch: percentages (`tax_percentage`) are not money and must not go through `paisasToRupees`.

### The storefront never imports from `lib/api/wire`

`Wire*` types are the API's shape. Adapters exist to absorb the paisas/rupees and flat/nested differences. Components import only from `@/lib/api`. Letting `Wire*` escape that directory is what reintroduces the mismatches the layer was built to prevent.

### Order totals are recomputed server-side

Checkout sends only variant IDs and quantities. The API recomputes every price, discount, shipping cost, surcharge and tax from the database. Nothing the browser believes about the total can influence what is charged. **Preserve this.**

The storefront mirrors the calculation for display only — and it must stay in sync, or checkout quotes one figure and charges another.

### `apiFetch` vs `apiFetchSafe`

- `apiFetchSafe(path, fallback, opts)` — public reads that must not fail a page render. Degrades to `fallback` when the API is unreachable or 404s.
- `apiFetch(path, opts)` — anything the user initiated. A rejected submission must surface to the person who made it, not be swallowed.

**Trap:** because `apiFetchSafe` never throws, TanStack Query's `isError` never fires for it. A failed fetch looks like an empty result. Screens driven by `apiFetchSafe` need to distinguish "genuinely empty" from "did not load" some other way — see the wishlist and compare pages.

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

---

## Features Implemented

### Catalogue
Products with tiered variants (Economy / Standard / Premium), multilingual names and descriptions, images, badges, tags, size guides, kit contents. Filtering, sorting, pagination, predictive search.

**Default variant selection** is centralised in `getDefaultVariant()` (`lib/utils.ts`): cheapest in stock, falling back to cheapest overall. The product card, the product page and add-to-cart must all use it. They previously decided independently, and with the API returning variants unordered, a card could advertise ₨1,199, open at ₨4,999, and add ₨4,999 to the basket. The API now also returns variants `orderBy: { price: 'asc' }`.

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

### Returns
Customer-facing half complete: eligible orders, request creation, own-request listing. 7-day window from the recorded delivery timeline entry. Admin moderation queue is pending.

### Reviews
Submission requires a signed-in customer; reviews appear publicly only after moderation. Admin queue endpoint is pending.

### Kit builder
`KitCategory` + `KitCategorySource` — a kit step is a merchandising grouping that can draw on several catalogue categories at once, with its own ordering, icon and required flag. Deliberately not a `Category`.

### Shop configuration
Key/value config with Redis caching, typed reads, admin CRUD, and a public endpoint driven by `is_public`.

### Also built
Categories, coupons, blog with category filtering, wishlist, saved addresses, profile, stock notifications, media upload, admin products and orders.

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

---

## Environment

`.env` at the repo root, loaded by the API via `ConfigModule` (`envFilePath: '../../.env'`).

Required: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_JWT_SECRET` (must differ), `REDIS_HOST`, `REDIS_PORT`, `STOREFRONT_URL`, `ADMIN_URL`, `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL`.

`NEXT_PUBLIC_API_URL` is inlined at build time and must be passed as a Docker **build arg**, not only as a runtime environment variable.

After pulling schema changes:

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed     # insert-only; never overwrites existing config
```
