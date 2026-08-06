# Tasks

The single source of truth for pending work on this project.

**Rules**

- One task file. Do not create other TODO/task files.
- Every new feature, bug, enhancement or refactor goes here.
- **Delete a task when it is done** — do not tick it off, do not keep a "completed" section. Git history is the record of what was finished.
- Grouped by priority. Move items between groups rather than duplicating them.
- Read this file before starting work, pick the task, do it, remove it.

---

## High

### Guest user experience — Phase 1: audit (report only, no code)

Review the storefront and backend across: auth flow, guest checkout, guest account/dashboard, orders, wishlist, saved addresses, profile, returns, route guards/middleware, navigation menu, API authorization, order tracking, session handling.

Deliver a written report with these sections before writing any code: **Current Implementation**, **Issues Found**, **Conflicts**, **Security Concerns**, **UX Improvements**.

Look for: guests reaching pages they should not, account menus that do not work for guests, unauthenticated APIs, missing route guards, duplicate or conflicting logic, guest and authenticated flows overlapping, UI shown to guests that needs login.

Known starting points:
- `POST /orders/track/:number` is already public and matches on `guestEmail`/`guestPhone` — probably most of the tracking requirement already exists.
- Guest orders already require a phone or email, so every guest order is trackable.
- `guest_checkout_enabled` is enforced server-side; check the UI honours it.
- `account/returns`, `addresses`, `profile`, `wishlist` were rewritten recently and all assume a signed-in user — most likely place for guard gaps.

### Guest user experience — Phase 2: implementation

**Blocked on Phase 1.**

- Guests may: browse, search, view PDP, cart add/update, coupons, shipping estimate, guest checkout, place order, track order by *number + email* or *number + phone*.
- Login required for: My Orders, Wishlist, Saved Addresses, Profile, Returns (plus saved payment methods / notifications / invoice downloads if they appear).
- Guest dashboard replaces the account dashboard — title "Guest Checkout", message "You checked out as a guest.", actions Track Your Order / Sign In / Create Account, plus account benefits.
- Navigation hides authenticated-only items from guests; shows Track Order / Sign In / Create Account.
- Protect `/account`, `/orders`, `/wishlist`, `/addresses`, `/profile`, `/returns` with a friendly login redirect.
- Backend: JWT enforced where required, guests cannot read another user's resources, orders only to authenticated users, guest tracking stays a separate public endpoint.

Finish with a summary: files modified, issues found, issues fixed, security improvements, UX improvements, remaining recommendations, breaking changes.

### Verify the storefront production build on real hardware

`next build` could not be verified in the dev sandbox — it dies with a bus error before emitting anything, including on an untouched copy, so it is environmental rather than a code fault. Typecheck, Jest and Vitest all pass. Run `npm run build` in `apps/storefront` on a real machine and fix anything that surfaces.

---

## Medium

### Admin panel — 6 pages are still `ComingSoon` stubs

`apps/admin/src/app/(dashboard)/`: `analytics`, `blog`, `categories`, `coupons`, `customers`, `reviews`.

Backends already exist for blog, categories, coupons and customers — those four are pure UI work following the established Products/Orders pattern (`hooks/use-*.ts`, `components/ui/{panel,field,button,toast,pagination,confirm-dialog}`, `RequireRole`).

### Reviews moderation queue

Needs a new `GET /reviews/admin` endpoint — only `findByProduct` exists today, so there is no way to see the pending queue across all products. Then build the admin screen (approve / reject / bulk approve / filter by rating).

### Returns moderation queue

`GET /returns/admin` exists. Missing: a status-transition endpoint (approve / reject / received / refunded) and the admin UI. The customer-facing half is done.

### Kit-category admin CRUD screens

The API is complete and guarded (`/kit-categories` + admin CRUD). Nothing in the admin panel consumes it, so kit builder steps can only be changed via the seed.

### Shop configuration admin UI

`GET /settings/admin`, `POST /settings`, `PATCH /settings/:key`, `DELETE /settings/:key` all exist. No admin screen uses them, so config can only be changed directly in the database. Group by `category`, respect `value_type` when rendering inputs, and make `is_public` an explicit toggle.

### Install admin dependencies

`apps/admin/node_modules` has never been installed, so the admin app has not been typechecked or built. Run `npm install` there and fix whatever surfaces.

---

## Low

### Payment gateway integration

JazzCash, Easypaisa and card are shown in checkout as **Coming Soon** and rejected by `CreateOrderDto`. Each needs its redirect/callback flow and `Order.paymentStatus` transitions. Then enable it in **both** `apps/api/src/common/payment-methods.ts` and `apps/storefront/src/lib/payment-methods.ts` — `orders.service.spec.ts` asserts the rejected set, so the test fails first if only one is updated.

Bank transfer is deliberately excluded and not planned.

### Analytics dashboard

Revenue and order trends over a date range, best/worst sellers, customer lifetime value and repeat rate, coupon performance, CSV export. Needs aggregation endpoints designed beyond the current `/orders/admin/stats` and `/products/admin/stats`.

### Remove remaining `as never` translation casts

`components/layout/header.tsx` and `components/layout/announcement-bar.tsx` cast translation keys to `never`, which defeats type checking. Those keys currently resolve, but the same pattern in `cart-drawer.tsx` hid a genuinely missing `cart.freeShipping` key and shipped the literal string to customers.

### Testimonials API

`components/home/testimonials-section.tsx` reads static content from `src/data/testimonials.ts`. Deliberately static for now — curated marketing copy with no admin surface. Only build this if marketing needs to edit it without a deploy.
