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

## Open security issues (customer-facing, pre-existing)

Found during the admin auth review. None are caused by the admin work, and
none are exploitable today because the storefront isn't wired to the API yet —
but they must be fixed before it is.

| # | Severity | Issue |
|---|---|---|
| 1 | High | `GET /orders/track/:number` is public and returns full customer PII. Order numbers are sequential (`YH-2026-1001`, `1002`, …), so the whole order table can be walked. Needs an email/phone match or an opaque per-order token. |
| 2 | High | `cart.controller.ts` has **no guards at all** and `UpsertCartDto` has no validator decorators — so `POST /cart` returns 400 for every request, and carts are keyed only on a client-supplied `x-session-id` (any caller can read or mutate any cart). |
| 3 | Medium | `PATCH /users/me/addresses/:id` types its body as `Partial<CreateAddressDto>`, which `ValidationPipe` skips entirely — a customer can set `userId` and move their address onto another account. Use `PartialType()` instead. |
| 4 | Medium | `GET /blog/:slug` has no `published` filter, so draft posts are publicly readable by slug. |
| 5 | Low | `POST /orders` reads `req.user?.id` on an unguarded route, so authenticated orders are always recorded as guest orders. Order numbers are also generated by `count + 1001`, which will collide under concurrent checkout. |

---

## Next targets

### 1. Wire storefront to real API
Replace mock data in `apps/storefront/src/data/*.ts` with real API calls. Key areas:
- `GET /api/v1/products` → shop page + homepage featured grid
- `POST /api/v1/auth/login` + `/register` → replace Zustand mock
- `GET/POST /api/v1/cart` → sync Zustand cart store with server
- `POST /api/v1/orders` → wire checkout flow
- `GET /api/v1/categories` → populate mega-menu + sidebar filters

### 2. Payment gateway integration
JazzCash, Easypaisa, and COD are in the `PaymentMethod` enum. Need to implement the actual redirect/callback flow per provider and update `Order.paymentStatus` accordingly.

---

## Competitors benchmarked

- **munawer.pk** — 19 categories, wishlist, compare, quick view, UGC video wall, Google review widget, travel subdomain
- **ibnezafar.com** — order tracking page, free-shipping progress bar, grid/list toggle, multi-brand structure, "check first then pay"

Gaps neither one covers, and worth winning on: loyalty programme, per-product size guides, and multi-language (English / Urdu / Arabic).
