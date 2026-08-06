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

### Deploy the order-number migration carefully

`20260806140000_unguessable_order_numbers` rewrites **every existing order number**, appending a random six-character token. It is required, not optional — public tracking now accepts the number alone, so an un-migrated row is a publicly readable order.

Before running it in production:

- Take a backup. The migration is re-runnable (its `WHERE` skips already-tokenised rows) but not reversible — the old numbers are not recorded anywhere.
- Every order number a customer already holds, in a WhatsApp confirmation or a screenshot, **stops working for tracking**. Decide whether support needs a lookup by old number, or whether an announcement goes out.
- Admin order search matches on the stored number, so staff searching `YH-2026-1042` still find it by prefix. Worth confirming against the real screen.


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

### Testimonials API

`components/home/testimonials-section.tsx` reads static content from `src/data/testimonials.ts`. Deliberately static for now — curated marketing copy with no admin surface. Only build this if marketing needs to edit it without a deploy.
