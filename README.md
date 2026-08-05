# Yala Haji — Custom E-Commerce Platform

Working files for the custom rebuild of yalahaji.com.
Tagline: *Your journey, our care.*

---

## Contents

| File | What it is |
|---|---|
| `01-features-spec.md` | Full feature & functionality spec — storefront + admin, with competitor benchmark |
| `02-homepage.html` | Homepage theme (v3) — approved direction |
| `03-shop-page.html` | Shop / collection page with filters |
| `assets/` | Logo files + category artwork |

Both HTML files are self-contained — open them directly in a browser, no server or build step needed. The logo is embedded as base64, so nothing breaks if the files are moved.

---

## Brand tokens

Colours were sampled directly from the logo artwork.

| Token | Hex | Used for |
|---|---|---|
| Deep Green | `#133C2A` | Primary — headings, buttons, Standard tier |
| Green Mid | `#1D5C40` | Hover states |
| Green Tint | `#EDF3F0` | Section backgrounds, active filter chips |
| Gold | `#BF9436` | Accent — badges, Premium tier, progress bars |
| Gold Deep | `#A67C28` | Links, button hover |
| Gold Tint | `#FAF4E7` | Promo blocks |
| Stone | `#8B968F` | Muted text, Economy tier |
| Line | `#E2E7E4` | Borders |
| Paper | `#FAFAF8` | Off-white surfaces |
| White | `#FFFFFF` | Page background |
| Alert Red | `#B5392F` | Sale badges, Sale nav item |

**Type:** Instrument Serif (display) + Plus Jakarta Sans (UI/body), both from Google Fonts.

**Radii:** 8px small · 14px medium · 22px large

---

## Tier system

Economy / Standard / Premium is a **global variant attribute** — it applies to every product, not just kits.

| Tier | Badge colour |
|---|---|
| Economy | Stone `#8B968F` |
| Standard | Deep Green `#133C2A` |
| Premium | Gold `#BF9436` |

---

## Storefront — Completed ✅

All storefront pages are built as a Next.js app under `apps/storefront/`. Everything runs on mock data; backend integration is the next phase.

**Layout & Shell**
Announcement bar, header with predictive search + cart/wishlist counts, mega-menu (two panels), cart drawer with free-shipping progress bar, WhatsApp bubble, sticky mobile bottom bar, footer (5 columns), language switcher (EN/UR/AR).

**Homepage** (`/`)
Event-based hero carousel (3 seasonal slides), USP strip, category tiles, featured product grid with filter pills, split promo banners, testimonial cards, blog preview, seasonal countdown banner, newsletter signup.

**Shop page** (`/shop`, `/shop/[category]`)
Sticky filter sidebar (category, tier, price, size, colour, rating, availability), toolbar with sort + per-page + grid/list toggle, removable active-filter chips, product cards with tier badges + stock urgency + colour swatches, load-more + numbered pagination, SEO copy block with FAQ accordion, mobile filter drawer.

**Product Detail Page** (`/products/[slug]`)
Image gallery with thumbnails + active state, tier/size/colour/scent variant selectors with live price + stock update, stock status (in/low/out), quantity picker, add-to-cart with cart-open feedback, wishlist toggle, gift wrap + message, share/WhatsApp/compare actions, trust badges, tabbed panel (Description / Size Guide / Kit Contents / Shipping & Returns), customer reviews with photo support + rating breakdown + helpful votes, related products grid.

**Cart page** (`/cart`)
Item list with quantity controls + remove, free-shipping progress bar, coupon code field (WELCOME10, HAJJ2025), order summary with discount + shipping + total, empty-state with suggested products.

**Checkout** (`/checkout`)
4-step flow — Address → Shipping → Payment → Review → Success. Address form with Pakistan provinces, three shipping options (Standard / Express / COD), five payment methods (JazzCash / Easypaisa / Card / Bank Transfer / COD), order review with edit-back, order confirmation screen with order number.

**Kit Builder** (`/kit-builder`)
Category tabs (Ihram, Accessories, Fragrances, etc.), global tier toggle (Economy / Standard / Premium), product selection grid with checkmark overlay, live kit summary sidebar with per-item remove, add-all-to-cart with cart-open feedback.

**Account area** (`/account/*`)
Sidebar nav layout, My Orders list, Order detail with status timeline, Wishlist, Addresses, Profile, Returns.

**Blog** (`/blog`, `/blog/[slug]`)
Post listing with category filter, full post detail page.

**Auth** (`/login`, `/register`)
Login and register forms (UI complete; backend auth not yet wired).

**Data & State layer**
Zustand stores: cart (persist + coupon + free-shipping logic), wishlist, compare. Mock data files: products, categories, reviews, testimonials, blog posts, orders, kit-categories. Full TypeScript types in `src/types/index.ts`. i18n messages in EN / UR / AR.

---

## Known gaps before backend integration

| Gap | Status | Detail |
|---|---|---|
| Product images | ✅ Fixed | `ProductImage` component in `src/components/ui/product-image.tsx` — wired in PDP gallery, thumbnails, product cards, cart drawer, and cart page. Falls back gracefully to emoji while real images are pending. |
| Auth | ✅ Fixed | Zustand auth store at `src/store/auth.ts` with mock login/register (accepts any valid input). Login + register forms submit properly and redirect to `/account`. Account layout shows real user name, initials, loyalty points, and active nav state. |
| Compare drawer | ✅ Fixed | `CompareBar` sticky footer wired into locale layout — shows selected products as chips, remove buttons, and "Compare Now" CTA. Compare page at `/compare` shows side-by-side attribute table with add-to-cart per product. |
| "Notify me" form | ✅ Fixed | Out-of-stock state in PDP now shows an email input + "Notify Me" button with a confirmation state. |
| Real API calls | ⏳ Pending | Requires backend. All data still from `src/data/*.ts` mock files — will be replaced when API layer is built. |

---

## API & Database — Completed ✅

Built under `apps/api/` — NestJS 10 with Fastify adapter, Prisma 5 ORM, MySQL 8.

**Infrastructure**
- `apps/api/src/main.ts` — Fastify adapter, global `/api` prefix, URI versioning (v1), `ValidationPipe`, CORS, Swagger at `/api/docs`
- `apps/api/src/app.module.ts` — ConfigModule, ThrottlerModule (120 req/60s), all feature modules imported
- `apps/api/src/prisma/` — global PrismaService + PrismaModule
- `.env.example` (repo root) — the single env file for every app; all required vars documented
- `apps/api/prisma/seed.ts` — admin user, 6 categories, 3 products (ihram, oud, full kit), 4 coupons, 5 settings

**Prisma Schema** (`apps/api/prisma/schema.prisma`)
All tables defined with correct MySQL types, relations, and indices:
`User · Session · Address · Category · Product · ProductVariant · ProductMedia · ProductBadge · ProductTag · SizeGuideEntry · KitContent · CartItem · Order · OrderItem · OrderTimeline · Return · Review · Wishlist · Coupon · StockNotification · BlogPost · Setting`

Key decisions: prices stored as `Int` in paisas (×100), multilingual fields (nameEn/Ur/Ar, descEn/Ur/Ar), guest cart via `sessionId`, order numbers formatted `YH-YYYY-NNNN`.

**Modules built**

| Module | Routes | Notes |
|---|---|---|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | JWT + Passport, bcrypt, phone or email login, Pakistani phone regex |
| **Products** | `GET /products`, `GET /products/:slug`, `GET /products/:id/related`, `POST/PATCH/DELETE` | Full filter: category, tier, size, color, scent, badges, price range, stock, rating; pagination |
| **Categories** | `GET /categories`, `GET /categories/:slug`, `POST/PATCH/DELETE` | Self-referential tree (parentId), returned as nested tree |
| **Variants** | `GET /variants/product/:id`, `PATCH stock`, `PATCH price`, `DELETE` | Separate stock/price patch endpoints |
| **Orders** | `POST /orders`, `GET /orders`, `GET /orders/track/:number`, `PATCH status`, `PATCH cancel` | Atomic transaction: stock decrement + coupon increment; auto-generate order number; admin + customer views |
| **Users** | `GET/PATCH /users/me`, addresses CRUD, wishlist CRUD, admin list + toggle-active | Profile, address book, wishlist all under `/users/me/` |
| **Cart** | `GET/POST/DELETE /cart`, clear, merge | Supports auth or guest (`X-Session-Id` header); merge endpoint for post-login cart sync |
| **Reviews** | `GET /reviews/product/:id`, `POST`, `PATCH approve`, `DELETE` | Auto-recomputes `avgRating` + `reviewCount` on product after each change |
| **Coupons** | `POST /coupons/validate`, `GET/POST/PATCH/DELETE` | Validates expiry, usage limit, min-order, computes discount |
| **Blog** | `GET /blog`, `GET /blog/:slug`, `POST/PATCH/DELETE`, admin list | Multilingual bodies as LongText, auto-sets `publishedAt` on first publish |
| **Media** | `POST /media/upload`, `DELETE` | MinIO upload + sharp WebP optimisation (max 1200px, q82) |
| **Search** | `GET /search?q=` | MeiliSearch, configures searchable/filterable/sortable attrs on startup |
| **Health** | `GET /health` | Returns `{status, timestamp, service}` |

---

## Admin Dashboard (`apps/admin/`)

Next 15 + Tailwind + TanStack Query, on port **3001**. Shares the storefront's
brand tokens. Full spec in sections 9–12 of `01-features-spec.md`.

Environment comes from the single `.env` at the repo root — there is no
per-app env file.

```bash
cp .env.example .env      # once, at the repo root
cd apps/admin
npm install
npm run dev          # http://localhost:3001
```

### Access control — separate from the storefront

The admin panel is its own trust domain. A customer token cannot reach a staff
route under any circumstance, because it fails on three independent counts:

| | Customer | Admin |
|---|---|---|
| Endpoint | `POST /auth/login` | `POST /auth/admin/login` |
| Transport | `Authorization: Bearer` | httpOnly cookie `yh_admin_session` |
| Secret | `JWT_SECRET` | `ADMIN_JWT_SECRET` (must differ — enforced at boot) |
| Audience claim | none | `yalahaji:admin` |
| Lifetime | 7 days | 8 hours |
| Revocable | no | yes — `sessions` table |
| Guard | `JwtAuthGuard` | `AdminJwtAuthGuard` |

The admin strategy reads the token **only** from the cookie — there is no
bearer fallback — so JavaScript cannot read it and an XSS bug on the dashboard
cannot exfiltrate a session.

Every request re-reads the user, so deactivating an account or changing its
role takes effect immediately rather than when the token expires. Deactivating
a user also revokes all of their sessions.

Sign-in is restricted to staff roles (`admin`, `manager`, `support`,
`fulfillment`). Navigation and pages are filtered by role, and the API enforces
the same rules via `RolesGuard` — the UI checks are for UX only.

**Brute-force protection:** 5 login attempts per minute per IP (throttler),
plus a 15-minute account lockout after 5 failed attempts. The lockout is
enforced on **both** login endpoints — staff and customers share one password
hash, so guarding only the admin door would leave the same credential
brute-forceable through the storefront. All failure modes return an identical
401 with matched timing, so the endpoint cannot be used to enumerate accounts
or confirm passwords.

| Area | Roles |
|---|---|
| Dashboard, Orders | admin, manager, support, fulfillment |
| Products, Inventory, Coupons, Reviews, Blog, Analytics | admin, manager |
| Deactivate a user | admin, manager |

### Built

| Section | Status | Notes |
|---|---|---|
| **Login** | Done | httpOnly cookie, session restored via `GET /auth/admin/me`, sign-out revokes server-side |
| **Dashboard** | Done | Revenue/orders/AOV KPIs, status breakdown, recent orders, low-stock list |
| **Products** | Done | List with search + category/status filters, create/edit form (multilingual, SEO, tags), variant editor, archive |
| **Orders** | Done | List with status filter + search, detail view with items/totals/timeline, guarded status transitions |
| **Inventory** | Done | Low-stock queue with inline stock editing |
| **Categories, Customers, Coupons, Reviews, Blog, Analytics** | Stubbed | Routes and nav in place; each page lists its plan and the endpoints already available |

### Conventions

- **Money is in paisas** (rupees × 100) on the wire. `formatPrice()` renders it;
  the product form converts to/from rupees at the input boundary.
- **`NEXT_PUBLIC_*` are build-time.** They're inlined into the client bundle, so
  `docker-compose` passes them as build `args`, not just `environment`.
- Status transitions follow `nextStatuses()` in `src/lib/utils.ts` — the
  dropdown only offers legal next states.

### Setup note

`ADMIN_JWT_SECRET` must be set and **must differ from `JWT_SECRET`** — the API
refuses to boot otherwise. Generate one with `openssl rand -base64 48`.
In production also set `COOKIE_DOMAIN` (e.g. `.yalahaji.com`) so the admin
subdomain can authenticate against the API subdomain.

### Still to do

- Image upload UI (`POST /media/upload` exists and is staff-guarded)
- Bulk CSV import/export for products
- Packing slips and refunds on orders
- The six stubbed sections above

---

## Security issues (customer-facing) — Resolved ✅

Found during the admin auth review, all fixed before storefront integration.

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | High | `GET /orders/track/:number` was public and returned full customer PII. Sequential order numbers meant the whole order table could be walked. | Now `POST /orders/track/:number` with a `contact` body field that must match the order's email or phone. Returns fulfilment fields only — no address, contact, coupon or payment data. Mismatches return a plain 404 so existence can't be probed. Throttled to 10/min/IP. |
| 2 | High | `cart.controller.ts` had **no guards at all** and `UpsertCartDto` had no validator decorators — `POST /cart` returned 400 for every request, and carts were keyed on a client-supplied `x-session-id`, so any caller could read or mutate any cart. | `OptionalJwtAuthGuard` on every route; `UpsertCartDto` moved to `dto/` with full decorators; guest session ids are now HMAC-signed and server-issued via `POST /cart/session`. An authenticated user always outranks the header. `POST /cart/merge` requires a real token. |
| 3 | Medium | `PATCH /users/me/addresses/:id` typed its body as `Partial<CreateAddressDto>`, which `ValidationPipe` skips entirely — a customer could set `userId` and move their address onto another account. | New `UpdateAddressDto extends PartialType(CreateAddressDto)`. The same pattern was found on the admin-guarded blog, coupon and category update routes and fixed there too. |
| 4 | Medium | `GET /blog/:slug` had no `published` filter, so draft posts were publicly readable by slug. | `findBySlug` takes `includeUnpublished`, defaulting to false. Drafts 404 publicly; staff preview via `GET /blog/admin/preview/:slug`. |
| 5 | Low | `POST /orders` read `req.user?.id` on an unguarded route, so Passport never ran and authenticated orders were always recorded as guest orders. Numbers came from `count + 1001`, which collides under concurrent checkout. | `OptionalJwtAuthGuard` makes `user` real. Numbering derives from the highest number *this year* inside a bounded retry loop, letting the `@unique` index arbitrate races. Also fixes drift across year boundaries. |

### Contract changes the storefront must follow

Three of these fixes change the public API shape:

| Before | After |
|---|---|
| `GET /orders/track/:number` | `POST /orders/track/:number` with `{ "contact": "<email or phone>" }` |
| Client invents its own `x-session-id` | `POST /cart/session` → `{ sessionId }`, persist it, send as `X-Session-Id`. Unsigned values are rejected with 401. |
| — | `GET /blog/admin/preview/:slug` for staff draft preview |

**Verified:** API typechecks clean; 36 assertions covering session signing and
forgery, contact matching across phone formats, order-number sequencing and
retry, and guard behaviour on valid / absent / malformed / expired / forged
tokens.

---

## Storefront ↔ API integration — Core commerce done ✅

The storefront previously made **zero** API calls: 23 pages, 26 mock import
sites, no client. It now runs on the real API for the entire buying path.

### The API layer (`apps/storefront/src/lib/api/`)

| File | Role |
|---|---|
| `client.ts` | Typed fetch wrapper — base URL, bearer token, `X-Session-Id`, error normalisation, `apiFetchSafe` for public reads |
| `wire.ts` | The shapes the API actually returns. Never imported outside this directory. |
| `adapters.ts` | The only place Wire types become domain types |
| `token.ts` / `session.ts` | Bearer token and signed guest-session storage |
| `products.ts` · `catalog.ts` · `auth.ts` · `cart.ts` · `orders.ts` | Resource functions |
| `index.ts` | Public surface — components import from `@/lib/api` |

**Four shape mismatches** sat between the two halves; the adapter layer absorbs
all of them, and every one is silent at runtime if it leaks:

| Mismatch | Consequence if missed |
|---|---|
| paisas → rupees | every price renders 100× too high |
| `nameEn` → `name.en` | product titles render as `undefined` |
| `hajj_guide` → `hajj-guide` | blog category filters match nothing |
| `category.slug` → `categorySlug` | breadcrumbs and related products go empty |

Enums (`Tier`, `OrderStatus`, `PaymentMethod`, `ShippingMethod`) already matched
exactly and pass through untouched.

**Rendering split:** catalogue, PDP, blog and sitemap fetch server-side for SEO;
cart, account, compare and search use React Query client-side. Account pages
*must* be client-side — the customer token lives in `localStorage`, which a
server component cannot read.

### Wired

Shop · category · PDP · homepage (featured, tiles, blog strip) · predictive
search (debounced) · blog list + detail · cart · checkout · login/register ·
account orders, order detail, addresses, profile, wishlist · compare · sitemap.

Plus, as of the August 2026 pass: `/account/returns`, `/kit-builder`, blog
category filters, and review submission on the PDP.

### Still on mock data

| What | Status |
|---|---|
| Homepage testimonials | Deliberately static — curated marketing copy, no admin surface planned yet. Documented in `src/data/testimonials.ts`. |

`src/data/` previously held seven files standing in for API calls. Six are gone;
only `testimonials.ts` remains, and it is editorial content rather than a
placeholder.

## August 2026 completion pass

### Validation

Client-side rules live in **`apps/storefront/src/lib/validation.ts`**, server-side
constants in **`apps/api/src/common/validation.ts`**. The two are intentional
mirrors — the storefront copy exists to catch a bad value before a round trip,
the API copy is what actually protects the database. Change one, change both.

`FormField` (`components/ui/form-field.tsx`) wires label, control and error
together for screen readers and reserves the error line so the layout does not
jump between keystrokes.

Forms now validated on both sides: checkout address, saved addresses
(create + edit), profile, login, register, review submission, return requests.

**The headline fix:** checkout had no validation at all, and `OrderAddressDto`
used bare `@IsString()`, which accepts `""`. Orders with a blank recipient and
no phone number were reaching the database — undeliverable, with no way to
contact the buyer. The review step also fell back to `address.fullName ||
'Muhammad Ali'`, so an empty form displayed a plausible-looking address that was
never going to be on the parcel.

### Business rules added to `OrdersService.create`

- A guest order must carry a phone or email. `trackOrder` matches on exactly
  those fields, so an order without either could not be looked up by its own
  buyer.
- The same variant cannot appear on two lines. Each line passed the per-line
  stock check while together exceeding stock.

### New modules

- `kit-categories/` — `GET /kit-categories` (public), plus admin CRUD behind
  `AdminJwtAuthGuard` + `STAFF_MANAGE`. New `KitCategory` + `KitCategorySource`
  models (migration `20260806090000_kit_categories`). A kit step is not a
  `Category`: it can draw on several catalogue categories at once and carries
  ordering, an icon and a required flag that have no meaning in the catalogue
  tree.
- `returns/` — `GET /returns/eligible-orders`, `GET /returns/me`,
  `POST /returns`, `GET /returns/:id`, plus `GET /returns/admin`. The `Return`
  model already existed; only the service and controller were missing. The
  7-day window advertised on the storefront is now enforced server-side, and one
  open request per order is allowed at a time.
- Blog: `GET /blog/categories` (enum-derived, with counts) and a `?category=`
  filter on `GET /blog`. The storefront's hardcoded list named four of the six
  categories, so posts in the other two had no filter chip; the page also
  fetched 50 posts and filtered in the browser, silently truncating anything
  past that window.

### Payment methods

**Cash on Delivery is the only method that can be selected.** It is also the
only one needing no integration — the courier collects, and `paymentStatus`
moves on fulfilment rather than on a callback.

| Method | State |
|---|---|
| Cash on Delivery | Enabled |
| JazzCash | Shown, greyed out, **Coming Soon** |
| Easypaisa | Shown, greyed out, **Coming Soon** |
| Credit / Debit Card | Shown, greyed out, **Coming Soon** |
| Bank Transfer | Not offered — the business does not support it |

The three gateway-backed methods have no integration behind them: no redirect,
no callback, nothing that moves `Order.paymentStatus` off `unpaid`. Offering
them produced orders that looked paid to the customer and were
indistinguishable from unpaid ones to fulfilment. Checkout also used to
*default* to `jazzcash`, so clicking straight through the payment step selected
one.

Bank Transfer is absent from both the enabled and coming-soon lists — it is not
an option and is not planned, so it is not advertised either.

Enforced on both sides. `CreateOrderDto` validates `paymentMethod` with
`@IsIn(ENABLED_PAYMENT_METHODS)` rather than against the whole enum, so a
hand-rolled request cannot bypass the UI. The footer's "Accepted Payments"
badges read the same lists, so it can no longer advertise something checkout
will not take.

| Where | File |
|---|---|
| API | `apps/api/src/common/payment-methods.ts` |
| Storefront | `apps/storefront/src/lib/payment-methods.ts` |

To enable one when its gateway ships, flip `comingSoon` in the storefront list
**and** add the method to `ENABLED_PAYMENT_METHODS` on the API. Both are
required, and `orders.service.spec.ts` asserts the rejected set — so re-listing
a method in the UI without wiring it up fails the test first.

The `PaymentMethod` enum and both TypeScript unions deliberately keep all five
values, `bank_transfer` included. Removing one would need a migration, would
fail against any historical row holding it, and admin and order-detail screens
must still render such an order.

### Newly integrated endpoints

`POST /reviews` had existed since the API was built and nothing called it — the
PDP could display reviews but never collect one. `createAddress` and
`updateAddress` were exported from the storefront's API layer but the "Add New"
and edit buttons on `/account/addresses` had no handlers.

### Misleading empty states

`fetchProducts` uses `apiFetchSafe`, so it degrades to an empty page rather than
throwing — meaning `isError` never fires. The wishlist and compare pages read
that as "you have nothing saved" and told customers their saved items were gone
when the catalogue simply had not loaded. Both now distinguish the two.

### Tests

- API: `npm test` in `apps/api` (Jest, 25 specs) — order guards, returns window
  and status rules, kit-category resolution.
- Storefront: `npm test` in `apps/storefront` (Vitest, 18 specs) — validation
  rules and the shared address rule set.

⚠️ **Run `npx prisma migrate deploy`, `npx prisma generate` and
`npm run prisma:seed`** — the kit-categories migration adds two tables and the
seed populates the five kit builder steps.

## API additions and fixes made during integration

**New modules**

- `settings/` — `GET /settings/public`. The storefront hardcoded
  `FREE_SHIPPING_THRESHOLD = 5000` in five places while the API charged against
  the seeded ₨2,999. The progress bar and the invoice disagreed; both now read
  this endpoint.
- `stock-notifications/` — `POST /stock-notifications`. The PDP "Notify Me"
  button posted nowhere. Throttled to 5/min because it accepts an arbitrary
  email address.

**Bugs found and fixed**

| Bug | Detail |
|---|---|
| Price sort was meaningless | `price_asc`/`price_desc` ordered by `variants: { _count }` — the *number of variants*, not price. "Price: low to high" returned an order unrelated to price. Now resolved against each product's cheapest active variant. |
| No way to query featured | `isFeatured` existed on the model with no filter, so the homepage grid couldn't ask for it. Added `?featured=true`. |
| `/products/:id/related` ignored `limit` | Every caller got exactly 4 regardless. |
| Coupon validation unvalidated | `@Body() body: { code, subtotal }` is an inline type literal — erased at compile time, so `ValidationPipe` skipped it. A missing `subtotal` reached the discount maths as `NaN`. Now a real DTO. |
| Guest checkout was impossible | `Order.addressId` is required, but a guest has no account and `/users/me/addresses` is guarded — so guest orders could never be created despite `guestEmail`/`guestPhone` existing for that flow. `CreateOrderDto` now accepts an inline `address`, and `addresses.userId` is nullable (migration `20260805130000_guest_addresses`). |

⚠️ **Run `npx prisma migrate deploy` and `npx prisma generate`** — the guest
address migration changes the schema.

## Next targets

### 1. Admin panel — 6 pages are still `ComingSoon` stubs
`analytics`, `blog`, `categories`, `coupons`, `customers`, `reviews` under
`apps/admin/src/app/(dashboard)/`. Backends already exist for blog, categories,
coupons and customers. Reviews needs a `GET /reviews/admin` moderation queue
(only `findByProduct` exists today), and analytics needs more than the current
`/orders/admin/stats` + `/products/admin/stats`.

Also pending on the admin side: the returns moderation queue (the customer half
and `GET /returns/admin` are done; approving/rejecting is not), kit-category
CRUD screens against the endpoints that now exist, and an admin settings
read/write endpoint — only `GET /settings/public` exists.

### 2. Remaining API modules
Testimonials, newsletter signup, review "helpful" votes.

### 3. Payment gateway integration
JazzCash, Easypaisa and card are disabled in checkout and rejected by
`CreateOrderDto` until a gateway exists. Each needs its redirect/callback flow
and `Order.paymentStatus` transitions; then enable it in the two
`payment-methods` files described above.

---

## Competitors benchmarked

- **munawer.pk** — 19 categories, wishlist, compare, quick view, UGC video wall, Google review widget, travel subdomain
- **ibnezafar.com** — order tracking page, free-shipping progress bar, grid/list toggle, multi-brand structure, "check first then pay"

Gaps neither one covers, and worth winning on: loyalty programme, per-product size guides, and multi-language (English / Urdu / Arabic).
