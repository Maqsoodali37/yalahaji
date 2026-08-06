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


### Verify the storefront and admin production builds on real hardware

`next build` could not be verified in the dev sandbox — it dies with a bus error before emitting anything, including on an untouched copy, so it is environmental rather than a code fault. The admin app fails the same way, confirming it is the sandbox and not either codebase. Typecheck, Jest and Vitest all pass for all three apps.

Run `npm run build` in `apps/storefront` and `apps/admin` on a real machine and fix anything that surfaces.

---

## Medium

### Confirm the 404 routes on real hardware

The 404 work is implemented and typechecks, but no HTTP status could be observed in the dev sandbox — `next dev` dies with the same bus error as `next build` (see the build task above). On a real machine, with the API running, confirm each of these returns **404** and renders the branded page with a clean console:

`/random-page` · `/en/random-page` · `/en/products/non-existing-product` · `/en/shop/non-existing-category` · `/en/collections/invalid-slug` · `/en/blog/invalid-slug` · `/en/shop/a/b/c` · `/xx/anything`

Then check the two error paths are still distinct: stop the API and confirm `/en/products/<a real slug>` renders `error.tsx`, **not** the 404 page.

### `GET /categories` still lists disabled categories

`findBySlug` now excludes `isActive: false`, so a disabled category 404s. `findAll` does not filter, so the storefront nav and filter sidebar can still link to one — a dead link that correctly 404s but should never have been offered.

Not fixed with `findBySlug` because the same endpoint is what the (unbuilt) admin categories screen will list from, and staff need to see disabled rows. Decide that first: either filter `findAll` and give admin its own listing, or pass an `includeInactive` flag.

### Admin panel — 6 pages are still `ComingSoon` stubs

`apps/admin/src/app/(dashboard)/`: `analytics`, `blog`, `categories`, `coupons`, `customers`, `reviews`.

Backends already exist for blog, categories, coupons and customers — those four are pure UI work following the established Products/Orders pattern (`hooks/use-*.ts`, `components/ui/{panel,field,button,toast,pagination,confirm-dialog}`, `RequireRole`).

### Reviews moderation queue

Needs a new `GET /reviews/admin` endpoint — only `findByProduct` exists today, so there is no way to see the pending queue across all products. Then build the admin screen (approve / reject / bulk approve / filter by rating).

### Kit-category admin CRUD screens

The API is complete and guarded (`/kit-categories` + admin CRUD). Nothing in the admin panel consumes it, so kit builder steps can only be changed via the seed.

### Shop configuration admin UI

`GET /settings/admin`, `POST /settings`, `PATCH /settings/:key`, `DELETE /settings/:key` all exist. No admin screen uses them, so config can only be changed directly in the database. Group by `category`, respect `value_type` when rendering inputs, and make `is_public` an explicit toggle.

### Install admin dependencies

`apps/admin/node_modules` has never been installed in the repo itself. `npm install` cannot complete against the dev sandbox's FUSE mount — it permits file creation but not `rename`/`unlink`, so npm aborts with `ENOTEMPTY` partway through (the same reason `prisma generate` fails there with `EPERM`).

Installing into a copy on a normal filesystem works, and `npx tsc --noEmit` passes clean against current `src`. So this is an environment task, not a code-fix task: run `npm install` in `apps/admin` on a real machine.

---

## Low

### Payment gateway integration

JazzCash, Easypaisa and card are shown in checkout as **Coming Soon** and rejected by `CreateOrderDto`. Each needs its redirect/callback flow and `Order.paymentStatus` transitions. Then enable it in **both** `apps/api/src/common/payment-methods.ts` and `apps/storefront/src/lib/payment-methods.ts` — `orders.service.spec.ts` asserts the rejected set, so the test fails first if only one is updated.

Bank transfer is deliberately excluded and not planned.

### Analytics dashboard

Revenue and order trends over a date range, best/worst sellers, customer lifetime value and repeat rate, coupon performance, CSV export. Needs aggregation endpoints designed beyond the current `/orders/admin/stats` and `/products/admin/stats`.

### Testimonials API

`components/home/testimonials-section.tsx` reads static content from `src/data/testimonials.ts`. Deliberately static for now — curated marketing copy with no admin surface. Only build this if marketing needs to edit it without a deploy.

### Order management — enterprise OMS (phased, needs schema)

The admin order screen now covers listing filters/sort/export, bulk status, tracking assignment, payment-status changes and returns moderation (all on the current schema). The remaining "enterprise OMS" scope is net-new and each item needs migrations and/or integrations. Do these in order; the audit's phased plan has the detail.

- **Audit log** (`AuditLog` model: actor, action, entity, before/after JSON, IP, at) wired into every order/return/payment mutation. Foundational — do first. `OrderTimeline` currently records payment/status changes with no actor.
- Internal vs customer notes (`OrderNote` model, `@mention`), replacing the single `Order.notes`.
- Fulfilment status + assigned staff (`Order.fulfilmentStatus`, `Order.assignedStaffId`).
- Shipment model (courier, label, history, delivery estimate); item-level edit/refund/replace.
- Customer rollups (previous orders, total spend, AOV, LTV, tags, loyalty tier).
- Document generation (invoice / packing slip / label / credit note / return slip PDF).
- Communication engine (email/SMS/WhatsApp + templates), and a granular per-action RBAC (`refund` / `cancel` / `export` / `view costs` / `view profit`) once cost/profit data exists.
- Risk level / source / sales channel / currency / invoice-number columns.

Out of scope by recorded decision unless the business changes it: payment capture/void/gateway (COD-only), widening the public tracking payload.
