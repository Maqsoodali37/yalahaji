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

### Apply the order-address snapshot migration and verify the account/checkout work

Two migrations, applied in order:

`20260807100000_order_address_snapshot` adds ten `shipping*` columns to `orders`
plus `area`/`email` to `addresses`, and **backfills every existing order from
its linked address row**.

`20260807140000_address_spec_fields` then adds `country` and a `labelType` enum
to `addresses`, **renames `isDefault` to `isDefaultShipping`** and adds
`isDefaultBilling`, and adds `shippingCountry` to the order snapshot. The rename
is the risky one — every read of `isDefault` in the API, storefront and admin
was updated, but a missed one is a Prisma "unknown argument" error at the
database call rather than a validation error, so grep for it after generating
the client. It must be applied together with the code, not before
or after: the storefront and admin now render the snapshot, so deploying the
code against an un-migrated database blanks the delivery address on every
historical order, and migrating without the code leaves ten unread columns.

It runs after `20260807120000_navigation_menus` — no conflict, they touch
different tables.

Nothing here could be installed, typechecked or run in the session that wrote
it: all three apps have no `node_modules`, and `npm install` failed in the cloud
sandbox with `403 Forbidden` against `registry.npmjs.org` (the same network
policy recorded in the audit-log task above, still in force). The change was
reviewed statically instead — including a compiler-verified check of the risky
TypeScript constructs against hand-built stubs — but treat it as unverified
until someone runs, on real hardware:

- `npx prisma migrate deploy && npx prisma generate` in `apps/api`, then
  `npx tsc --noEmit && npm test`. The seven new `orders.service.spec.ts` cases
  need the generated client to typecheck at all.
- `npm test` in `apps/storefront` — new `lib/address.test.ts`,
  `lib/order-status.test.ts`, and an `adaptOrder` block in
  `lib/api/adapters.test.ts`.
- `npx tsc --noEmit` in `apps/storefront` and `apps/admin`.

Then exercise, on a **database with orders placed before the migration**:

- Open an old order in My Orders and in the admin. Edit the saved address it
  was placed against. Reopen both — the order must still show the old address.
  This is the whole point of the change; if it fails, something is reading
  `order.address` again.
- Delete that saved address entirely. The order must be unaffected.
- Checkout signed in: the default address prefills with no typing. Switch
  addresses via the picker and via Change Address — no network request should
  fire (check the Network tab; the list is cached from page load).
- Add a new address during checkout, tick "save to my account" and "make
  default", place the order. Confirm the new address is in the address book,
  the old default was demoted, and the order snapshot matches.
- Checkout signed in **without** ticking save: type a one-off address, place
  the order. Confirm it does **not** appear in the address book, and that the
  order still shows it.
- Guest checkout: no picker, no save tickbox, order places and tracks normally.
- Order history pagination past page 1, and the "Showing 1–10 of N" line.
- `POST /orders/track` on an order with a full address — confirm the response
  still carries no name, phone, email or address.
- Set an address as the default **billing** address, then set a *different* one
  as the default **delivery** address. Confirm the first is still the default
  billing address — a sweep that clears both flags is the failure this split
  introduces, and it is invisible on screen until someone looks for it.
- Confirm legacy free-text labels survived: any address labelled something
  other than "Home"/"Office" should open with the "Other" chip selected and the
  original text still in the field.
- Tick "save this address" at checkout, then open the address book. The new
  entry should be labelled with the city and show the **Other** chip — not
  "Home". Both the free-text label and the `labelType` enum have to be sent for
  this; sending only the first leaves the enum at its `home` default.

### What was verified, and what was not

No dependency install was possible — `npm` returns 403 against the registry
from this environment, and there is no MySQL or Docker daemon. So:

**Verified mechanically.** Zero syntax errors across all 355 `.ts`/`.tsx` files
(`tsc` parse-only). Every object literal typed as `Address`/`AddressInput`
type-checks complete under `--strict` in an isolated harness. `formatAddressLines`
was compiled and executed against domestic, foreign and blank countries.

**Verified by reading only.** Everything touching Prisma or Nest — the two
migrations, `schema.prisma` agreement, `orders.service.ts`, `users.service.ts`,
and all DTO decorators. Two independent review passes; the second found the
`labelType` gap listed above. The migration SQL has never been run.

**Not verified at all.** No test suite was executed. `apps/api`,
`apps/storefront` and `apps/admin` all have no `node_modules`.

Run `npx prisma migrate dev` and the three test suites before trusting any of
this.

**2026-08-08 session.** Re-checked from a fresh cloud sandbox specifically to
verify this feature end-to-end (it maps directly onto a "customer order
history + checkout address management" request). Same result as before:
`npm install`/`npm ping` still return `403 host_not_allowed` against
`registry.npmjs.org` from the cloud container, `apt-get` is likewise `403`,
there is no MySQL client or running daemon, and `docker info` has a client but
no daemon socket (`/var/run/docker.sock` does not exist) — so `prisma migrate
deploy`, `tsc`, and both test suites are still unrun. This is an org-level
network policy on the cloud sandbox, not something fixable from inside a
session; `device_bash` (the user's own machine, via the desktop bridge) has no
network access at all, so it cannot substitute either. Real verification still
needs to happen on hardware with npm registry access, per the checklist above.

What **was** done instead, since the toolchain was unavailable: a manual
read-through of `orders.service.ts`, `users.service.ts`, both address
migrations, `schema.prisma`, both DTOs, the adapters, `AddressForm`,
`SavedAddressPicker`/`ChangeAddressPanel`, `checkout-client.tsx`'s address
handling, and both order-detail pages (storefront + admin), checked line by
line against the acceptance criteria. One real bug found and fixed:

- **Clearing an optional address field (Address Line 2 / Area / Postal Code /
  Email) in the edit-address form silently did nothing.** `AddressForm` sent
  `undefined` for an emptied field; `apiFetch` sends the body through
  `JSON.stringify`, which drops a key whose value is `undefined` — so the
  PATCH never carried the field at all. A PATCH treats an omitted key as
  "leave alone", the same rule already documented for `MenuItemInput`, so the
  API left the old value in place and it reappeared on the next fetch. Fixed
  by sending `null` instead of `undefined` for these four fields (widened
  `AddressInput` and `CreateAddressDto`/`UpdateAddressDto` to accept it — the
  `@IsOptional()` validators already tolerated `null`, they just never
  received one), plus a `users.service.spec.ts` regression test pinning that
  `updateAddress` passes `null` straight through to Prisma rather than
  something upstream coercing it back to `undefined`. Everything else checked
  out against the acceptance criteria — no other bug found by reading.

- Noted, not fixed: `apps/api/dist/` is a stale build (predates the
  `isDefault → isDefaultShipping` rename) but is `.gitignore`d and gets
  overwritten by the next real `nest build`, so it is harmless as long as
  nobody runs `node dist/main.js` without rebuilding first.

### One caveat on `20260807100000_order_address_snapshot`

Its header comment claims every snapshot column is nullable "so the ALTER does
not rewrite the table under a NOT NULL default". That reasoning is wrong — the
next migration adds two `NOT NULL DEFAULT` columns without the concern, and both
are `ALGORITHM=INSTANT` on MySQL 8.0.12+. The real reason is that `orders` is
already populated and the backfill fills them afterwards.

The comment was left as-is deliberately: Prisma checksums migration files, so
editing one that has already been applied makes the next `migrate dev` fail. If
the menus session ran `migrate dev` while this was pending, this migration is
already applied. Fix the wording only if `prisma migrate status` shows it has
not been.

### Apply the navigation-menus migration and verify the API-driven storefront nav

`20260807120000_navigation_menus` adds `menus` and `menu_items`, and adds
`users.customer_group` (NOT NULL, defaults to `retail`, so every existing account
keeps working with no backfill). It carries the whole Menu Management feature:
`apps/api/src/menus`, the storefront's `components/navigation/*`, and a rewired
header, mega menu, mobile drawer and footer.

**The real toolchain has never run against it.** `npm install` failed in the
sessions that wrote it — `403 host_not_allowed` against `registry.npmjs.org` in
the cloud sandbox, and the device shell has no network at all — so `nest build`,
`tsc --noEmit`, Jest, Vitest and Prisma have all gone unrun.

What *was* done, and is worth knowing because it is stronger than a read-through:

- `apps/storefront/src/lib/api/adapters.ts` compiles clean standalone under
  `--strict`, and the storefront menu logic was **executed** — 49 assertions
  across the adapters, `active-route` and `menu-constants`, all passing.
- `menus.service.ts` was loaded and **executed** against hand-made Prisma, cache
  and audit doubles: 12 checks on the negative cache and reorder semantics, 19 on
  visibility, scheduling, tree assembly and `megaConfig` normalisation, plus an
  exhaustive cycle search over **300,000** (persisted state x reorder batch)
  combinations — 95,548 accepted, none leaving a cycle.
- `menus.service.spec.ts` was compiled against Nest/Prisma stubs and executed by a
  reviewer at 32/32, before the last round of fixes added 8 more cases.
- Three adversarial review passes found and fixed 20-odd defects, several of them
  real: an open redirect via `/\evil.example`, a reorder cycle guard that
  validated against the pre-move tree, a negative cache that was a silent no-op on
  Redis, and desktop dropdowns that no keyboard or touch user could open.

None of that substitutes for a build. Treat it as unverified until, on real
hardware:

- `cd apps/api && npm install && npx prisma migrate deploy && npx prisma generate`
  then `npx tsc --noEmit && npm test`. The new `Menu`/`MenuItem`/`CustomerGroup`
  Prisma types are what `menus.service.ts` and `menus.service.spec.ts` need to
  typecheck at all.
- `npm run prisma:seed` — insert-only. It creates the header, mobile and footer
  menus from `src/menus/default-menus.ts`, which is the navigation that used to be
  hardcoded. **Until this runs the storefront has no menus**, and every nav falls
  back to Home/Contact. Confirm the header renders the nine top-level items, the
  Ihram mega panel opens with its six children, and the footer shows its three
  columns.
- `cd apps/storefront && npm install && npx tsc --noEmit && npm test`.
- `cd apps/admin && npm install && npx tsc --noEmit`. The admin **Menus** screen
  (`app/(dashboard)/menus`) is the only way to edit menus without writing SQL, and
  it has never been compiled by the real toolchain either. A reviewer did compile
  all 60 files under `strict` against hand-written stubs and got a clean exit, and
  the tree maths passes 26 executed assertions — but the stubs are not the real
  `@types/react`.

Then exercise the admin screen: create a menu for a location that has none, add a
child item, drag it to reparent it, switch an item off, give one a publish window,
and delete a parent — confirming the delete dialog's count matches how many rows
actually go. Two behaviours are worth checking specifically because they were bugs
found late: **clearing** a field (badge, icon, image, a publish date) must actually
clear it, and an untouched mega-menu panel must not be rewritten on save.

Then exercise the behaviour the tests cannot reach:

- **Keyboard.** Tab to a header item with a dropdown and confirm the panel opens
  on focus, `Escape` closes it, and tabbing from the trigger *into* the panel does
  not close it.
- **RTL.** Switch to Urdu or Arabic and confirm the dropdown opens toward the
  correct side (it uses `start`/`end`, not `left`/`right`) and a second level
  opens beside its parent rather than off-screen.
- **Scheduling and visibility.** Set `publish_until` on an item to a minute out and
  confirm it disappears without an admin touching it — this is filtered at read
  time, and only the raw rows are cached, so it should be exact rather than
  TTL-late. Set one to `visibility = 'wholesale'` and confirm it is absent for a
  guest and for a `retail` account and present for a `wholesale` one.
- **Publishing.** Set `MENU_REVALIDATE_SECRET` on both apps, change an item, and
  confirm the storefront updates on the next request rather than after 60 seconds.
  See the separate task about this under Medium — this is the part most likely not
  to work.
- **Outage.** Stop the API and confirm the header serves the last cached menu, and
  that a cold start with no cache renders Home/Contact rather than an empty bar.

`_to_delete/mega-menu.tsx.superseded` is the old hardcoded mega menu, moved rather
than deleted because the sandbox shell cannot unlink files. Delete it, along with
the `v3-*.tar.gz` review snapshots in the same folder.

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

### Admin panel — 5 pages are still `ComingSoon` stubs

`apps/admin/src/app/(dashboard)/`: `analytics`, `blog`, `coupons`, `customers`, `reviews`. (`categories` and `settings` are done — see below and the Store Settings task above.)

Backends already exist for blog, coupons and customers — those three are pure UI work following the established Products/Orders pattern (`hooks/use-*.ts`, `components/ui/{panel,field,button,toast,pagination,confirm-dialog}`, `RequireRole`).

### Verify the categories admin build on real hardware

The categories admin module (tree view, drag-and-drop, bulk actions, SEO/translation tabs) and its API fixes (soft delete, circular-hierarchy guard, unbounded tree depth, slug-clash-on-rename, the old `GET /categories` listing disabled rows) were built and manually reviewed line-by-line, but `npm install` could not complete in that session's sandbox even in a copy outside the FUSE mount — the npm registry returned intermittent `403`s and installs hung partway through. **A real Docker build (`Dockerfile`/`Dockerfile.admin`) already caught two real type errors this review missed**: an unexported `BulkSkip` interface reachable from a public controller method (`nest build`'s declaration-emit check, TS4053), and a `types/index.ts` `Category` type that briefly lost its `isActive` field to a working-tree race with concurrent edits (see note below) — both fixed. Re-run `npx tsc --noEmit` and `npm test -- categories` in `apps/api`, and `npx tsc --noEmit` in `apps/admin`, to catch anything else, and run `npx prisma migrate deploy` to apply `20260806180000_category_admin_fields` (it runs after `20260806170000_audit_log`, no conflict).

**Note on the race:** this task and the Store Settings work above were built in two concurrent sessions against the same working directory; one session's `git add -A && git commit` fired while the other's file writes were still in flight, so the commit (`349c607`) caught some files mid-edit. Running two agents against one uncommitted working tree at once is what caused it — worth avoiding, or committing more often, next time both are in flight together.

### Product form's category picker only lists root-level categories

`apps/admin/src/components/products/product-form.tsx` renders `categories.data?.map((c) => <option>...)` — a flat map over the top-level tree array, so a product can only be filed directly under a root category, never a subcategory. This predates the categories admin module (the old `findAll()` returned the same root-plus-nested-children shape); it's more visible now that the tree UI supports unlimited depth end-to-end. Fix by flattening the tree with indentation, the same way `category-form-dialog.tsx`'s parent picker already does (`flattenForPicker`).

### Billing address has columns but no consumer

`Address.isDefaultBilling` is stored and editable in the address book, and the
order detail page says "same as the delivery address". Nothing collects a
billing address, because cash on delivery is the only enabled payment method.

When the payment-gateway work below lands, this is what needs building: a
billing-address selector at checkout (defaulting to the shipping address), an
`Order.billing*` snapshot mirroring the shipping one, and the order/admin detail
blocks that render it. The address columns are already there, so it is not a
migration against `addresses`.

### Order history: filters, search and date range

The customer order list paginates server-side and sorts newest-first, but offers
no filtering. `GET /orders` already routes through `buildOrderWhere`, which
supports status, payment status, date range and total range — the customer route
just does not pass them. Worth adding a status filter and a date range once
someone has enough order history to need one; the API work is a parameter pass,
not a new endpoint.

### Reorder drops unavailable lines silently

The Reorder button on My Orders adds every line back to the basket and routes to
the cart. The cart store syncs each line to the API in the background, so a
variant that has been discontinued or is out of stock fails there and surfaces
through the cart's existing `syncError` — which says something went wrong, not
*which item* could not be added. Worth a pre-flight check that names the
unavailable lines before the basket is touched.

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

### Footer builder — social icons and copyright only; the rest is done

**Superseded in part.** The schema question this task described ("a footer link
is not a `Setting` row") is answered: `Menu`/`MenuItem` (migration
`20260807120000_navigation_menus`) covers the footer as `MenuLocation.footer`,
with grouping via `parent_id` and ordering via `order`. The storefront footer
renders from it entirely (`components/navigation/footer-nav.tsx`), and the three
inline arrays are gone.

The admin UI is built too (`apps/admin/src/app/(dashboard)/menus`) — one screen
covering every location, so the footer and header are managed together.

Still outstanding and *not* covered by the menu model, because neither is a link:

- Social icons — see the Social Media task; those are `Setting` rows, rendered by
  the footer's brand column, not menu items.
- Copyright text — a `Setting`.

---

### Shop page ignores every query parameter

`components/shop/shop-page.tsx` holds filters in client state and never reads
`searchParams`, so `/shop?filter=sale`, `?tier=Premium`, `?brand=`, `?collection=`
and `?gender=` all render the unfiltered catalogue.

This predates the menu work — the old hardcoded header already linked to
`/shop?filter=sale` — but the menu model makes it visible in two more places:
`linkType: brand` and `linkType: collection` route to `/shop?brand=…` and
`/shop?collection=…` (there is no `/brands` or `/collections` route), so those two
link types currently land on the full catalogue. Reading the filters from the URL
fixes all of it at once, and makes a filtered view shareable and linkable, which
it is not today.

### Confirm menu publishing actually invalidates the storefront cache

`fetchMenu` passes `signal: null` specifically so Next does not opt the request
out of its Data Cache — a `fetch` carrying an `AbortSignal` is treated as
uncacheable, which would leave the `menus` tag attached to nothing and make
`revalidateTag('menus')`, and therefore the whole publish path, a silent no-op.

That reasoning is from the Next docs, not from an observed build. On real
hardware: set `MENU_REVALIDATE_SECRET`, edit a menu item in the database, call
`POST /menus/admin/publish`, and confirm the storefront reflects it on the next
request rather than after 60 seconds. If it does not, the same exposure applies
to every other `next: { revalidate }` call in `lib/api/` — they all go through
`apiFetch` and all still carry the default timeout signal.

### Account navigation is still hardcoded

`app/[locale]/account/layout.tsx` holds a five-item `NAV` array (orders, wishlist,
addresses, profile, returns). Deliberately left out of the menu system for now —
these are auth-guarded routes whose existence is decided by code, not by
merchandising, and an admin removing "Returns" from a menu would not remove the
route. Revisit if staff ever need to reorder or hide them.

The same applies to `components/layout/mobile-bottom-bar.tsx` (five fixed slots)
and the utility links in `header.tsx` (compare, wishlist, track order, sign in).
`components/layout/not-found-view.tsx` and `components/home/guides-tips.tsx` are
the two that most plausibly *should* become menu- or CMS-driven.

### `app/not-found.tsx` links to `/en/shop` regardless of locale

The root 404 (the one that renders outside `[locale]/layout.tsx`) sends an Urdu or
Arabic visitor to the English shop. Pre-existing. It has no locale in scope by
design — that is the whole reason the file exists — so the fix is either a
locale-less `/shop` that middleware redirects, or reading the `Accept-Language`
header.

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
