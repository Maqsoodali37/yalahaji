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

### Apply the audit-log migration and verify the new Store Settings admin screen

`20260806170000_audit_log` adds the `audit_logs` table and a new `apps/api/src/audit-log` module, wired into `SettingsService.create/update/remove` so every write to shop configuration now records who changed what and from what. The admin panel gained a **Store Settings** screen (`apps/admin/src/app/(dashboard)/settings`) built against the existing `/settings/admin` CRUD API, grouped by category, with an inline value editor per `valueType` and a per-row/aggregate change-history panel against the new `GET /audit-logs`.

None of this could be installed, typechecked or run in the session that wrote it — `apps/api`, `apps/admin` and `apps/storefront` all had no `node_modules`, and `npm install` failed in the cloud sandbox with `403 host_not_allowed` against both `registry.npmjs.org` and `pypi.org` (a network policy for that session, not a code problem — see the build task below for the *other* known sandbox limitation, a bus error unrelated to this one). So treat this as unverified until someone runs, on real hardware:

- `npx prisma migrate deploy && npx prisma generate` in `apps/api`, then confirm `npx tsc --noEmit && npm test` passes — the new `AuditLog` Prisma types and the `settings.service.spec.ts` / `audit-log.service.spec.ts` changes need the generated client to typecheck at all.
- `npm install` in `apps/admin`, then `npx tsc --noEmit`.
- Exercise the screen: create a setting, edit one inline (confirm the value actually changes on the storefront's `/settings/public` after the cache TTL or an edit — invalidation was not changed but is now exercised through a new call path), delete one as `admin`, confirm a `manager` account can edit but the delete button is hidden and the API 403s if forced, confirm `support`/`fulfillment` don't see "Store Settings" in the nav at all. Open the History panel on a row and confirm the actor name, role and before/after values are correct.

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

### Install admin dependencies

`apps/admin/node_modules` has never been installed in the repo itself. `npm install` cannot complete against the dev sandbox's FUSE mount — it permits file creation but not `rename`/`unlink`, so npm aborts with `ENOTEMPTY` partway through (the same reason `prisma generate` fails there with `EPERM`).

Installing into a copy on a normal filesystem works, and `npx tsc --noEmit` passes clean against current `src`. So this is an environment task, not a code-fix task: run `npm install` in `apps/admin` on a real machine.

### General store information — extend shop config, remove storefront hardcoding

`config-catalogue.ts` already seeds `store_name`, `store_email`, `store_phone`, `currency`, `currency_symbol` (category `store`). Add the rest as new keys in the same category: tagline, company name, website URL, support email, WhatsApp number, business address, Google Maps URL, timezone, default language. All public — the storefront reads them.

Then audit the storefront for each of these baked in literally — header, footer, contact page, checkout, invoice, SEO tags — and replace with `useShopSettings()` (client) or `fetchSettings()` (server), per the existing "never hardcode a configured amount" rule in `PROJECT_SPEC.md`, extended here from money to store identity. Same trap applies: a translation string must take the value as a parameter, never contain it.

### Branding — logo/favicon slots

New config keys (category `branding`, `value_type: string`, each holding a MinIO URL): header logo, footer logo, mobile logo, favicon, email logo, invoice logo. Upload through the existing `POST /media/upload` pipeline (already re-encodes to WebP, 10 MB cap) — reuse the `components/products/media-manager.tsx` pattern for the admin upload/replace/preview/delete UI rather than building a new one.

Storefront: read each slot through settings and fall back to a bundled default asset when the key is unset or the URL 404s, so an empty config never breaks the header. Wire into header, footer, `<link rel="icon">`, email templates and invoice rendering.

### Shipping settings — the rest of the toggles

`free_shipping_threshold`, `standard_shipping_cost`, `express_shipping_cost`, `cod_fee`, `cod_enabled` already exist (category `shipping`/`checkout`/`payment`) and are already read correctly everywhere per the hardcoding rule. Missing: an explicit `free_shipping_enabled` toggle (today "free shipping" is implied by the threshold being set — decide whether `0`/unset should mean "disabled" or "always free", since those are different states an admin will expect to control separately), `express_shipping_enabled`, and `pickup_enabled`. Add the keys, then gate the checkout shipping-method list and the free-shipping announcement bar on them.

### Footer builder

Needs new tables — a footer link is not a `Setting` row, it is a list with ordering, grouping (company/customer/help/custom) and enable/disable, which the key/value model does not fit. Design a small schema (a `FooterSection`/`FooterLink` pair, or reuse the kit-category "group + ordered children" shape from `KitCategory`/`KitCategorySource`) plus admin CRUD with drag-to-reorder. Storefront footer must render from it entirely, including social icons (see the Social Media task) and copyright text (a `Setting`).

### Main menu builder

Same shape problem as the footer, one level deeper — items can nest (parent/child/mega menu) and can point at a category, product, CMS page or external URL. Model as a self-referencing table (`MenuItem.parentId`, mirroring `Category.parentId`) with a `linkType` discriminator and drag-to-reorder `order`. The storefront header nav currently reads from wherever it is today (not audited here — read that file when this task is picked up rather than assuming); replace it with a fetch from the new endpoint, cached like `fetchSettings()`.

### Banner management

Six banner placements (homepage, promotional, category, product, popup, checkout), each with desktop/mobile/tablet images, title/subtitle/description, CTA, start/end date and an enable flag — this is a `Banner` model with a `placement` enum or string discriminator, not a config row (per-banner image sets and scheduling don't fit key/value). Reuse the media-upload pattern from Branding above for the three image slots. Storefront needs a carousel component for placements that allow more than one active banner, and must filter to `isActive && now BETWEEN startDate AND endDate` at read time — not just at publish time — so a scheduled banner starts and stops without an admin touching it at the boundary.

### Homepage section ordering

Drag-and-drop order for hero slider / featured categories / featured products / flash sale / new arrivals / brands / testimonials / newsletter. A single `Setting` row (`value_type: json`, key `homepage_layout`) holding an ordered array of section keys plus each section's enabled flag is enough — this is ordering and visibility, not per-section content, so it does not need its own table. The homepage must render sections in that order and skip disabled ones; fall back to the current hardcoded order if the key is unset so an empty config doesn't blank the homepage.

### Social media links

New config keys (category `social`, all optional strings): Facebook, Instagram, TikTok, YouTube, LinkedIn, X. Feed into the footer builder's social-icon block and the contact page. Blank means "don't render that icon" — no placeholder link.

### SEO settings

Default meta title/description/keywords, OG image, Twitter card type, `robots.txt` body, sitemap config, GA/GTM/Meta Pixel IDs — config rows (category `seo`), all public since they render into `<head>`. `robots.txt` needs a route that serves the stored value as `text/plain` rather than a static file. GA/GTM/Pixel need conditional script injection (skip entirely when the ID is unset, not render an empty tag) and should respect a future cookie-consent gate if one is ever added — not in scope now, just don't paint into that corner.

### Email settings (SMTP)

SMTP host/port/user/password (password needs to be a secret, never returned by `GET /settings/admin` in plaintext — this is the first config value where "staff can see it in the admin panel" is the wrong default; decide the masking approach before building), sender name/email, reply-to. Needs a "send test email" admin action, meaning this is the first settings feature that also needs a service integration (nodemailer or similar) — check whether the API sends any transactional email today before assuming this is greenfield.

### Theme settings

Primary/secondary/accent color, font family, button style, border radius — config rows (category `theme`, all public), consumed as CSS custom properties injected at the storefront root rather than requiring a rebuild per change. Needs a sane fallback set matching the current hardcoded Tailwind theme, so an empty config renders identically to today.

### Announcement bar

Text, link, background/text color, active flag, start/end date — same shape as one Banner row; either a dedicated small table or, if only one announcement is ever active at a time, a single `json`-typed `Setting`. Reuses the scheduling logic from Banner management (read-time filtering, not publish-time). Storefront: this already exists in some hardcoded form per `PROJECT_SPEC.md`'s shipping-hardcoding story (`announce.freeShipping`) — check whether this task subsumes fixing that, or whether that one is already resolved by the Shipping settings task above.

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

- ~~Audit log~~ **Built.** `AuditLog` (`apps/api/src/audit-log`) is generic — actor, action, `entityType`/`entityId`, before/after JSON, IP, timestamp — and already wired into `SettingsService`. What remains here is wiring the *same* service into every order/return/payment mutation; `OrderTimeline` currently records payment/status changes with no actor. Call `AuditLogService.record()` from `orders.service.ts` alongside each `OrderTimeline` write rather than building a second table.
- Internal vs customer notes (`OrderNote` model, `@mention`), replacing the single `Order.notes`.
- Fulfilment status + assigned staff (`Order.fulfilmentStatus`, `Order.assignedStaffId`).
- Shipment model (courier, label, history, delivery estimate); item-level edit/refund/replace.
- Customer rollups (previous orders, total spend, AOV, LTV, tags, loyalty tier).
- Document generation (invoice / packing slip / label / credit note / return slip PDF).
- Communication engine (email/SMS/WhatsApp + templates), and a granular per-action RBAC (`refund` / `cancel` / `export` / `view costs` / `view profit`) once cost/profit data exists.
- Risk level / source / sales channel / currency / invoice-number columns.

Out of scope by recorded decision unless the business changes it: payment capture/void/gateway (COD-only), widening the public tracking payload.
