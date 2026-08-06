# Guest User Experience — Phase 1 Audit

Report only. No code was changed. Every claim below was checked against the files named.

Scope: auth flow, guest checkout, guest account/dashboard, orders, wishlist, saved addresses, profile, returns, route guards/middleware, navigation, API authorization, order tracking, session handling.

**Headline:** the API side is in good shape — every customer-scoped route carries an explicit guard and ownership is scoped correctly. The storefront has **no route protection at all**. A signed-out visitor can open every page under `/account` and is shown a fabricated identity while doing it.

---

## Current Implementation

### Authentication and session

| Concern | How it works today |
|---|---|
| Token | JWT in `localStorage` (`lib/api/token.ts`), sent as `Authorization: Bearer` by `apiFetch` |
| User cache | Zustand `persist` store `yalahaji-auth`, `partialize`d to `{ user }` only |
| Revalidation | `hydrate()` runs on rehydrate; calls `fetchMe()`, clears the session on a 401, keeps the cached user on a network error |
| Gate flag | `isHydrating` exists on the store and is correct |
| Guest cart | `X-Session-Id` from `POST /cart/session`, signed; merged into the account by `mergeGuestCart()` on login **and** register |
| Sign-in identifier | Phone or email, normalised only when it looks like a phone (`toIdentifier`) |

The token/hydration design is sound. `hydrate()` distinguishing a 401 from a dropped connection is exactly right, and the login/register paths both merge the guest cart with the merge failure deliberately non-fatal.

### API authorization — verified route by route

| Controller | Routes | Guard |
|---|---|---|
| `orders` | `POST /orders` | `OptionalJwtAuthGuard` (correct — serves both) |
| | `GET /orders`, `GET /orders/:number`, `PATCH /orders/:id/cancel` | `JwtAuthGuard` |
| | `POST /orders/track/:number` | public, `@Throttle(10/60s)` |
| | `admin`, `admin/stats`, `admin/:id`, `:id/status` | `AdminJwtAuthGuard` + `RolesGuard` |
| `users` | `me`, `me/addresses` (×4), `me/wishlist` (×3) | `JwtAuthGuard` on every one |
| `returns` | `eligible-orders`, `me`, `POST /`, `:id` | `JwtAuthGuard` |
| `reviews` | `POST /reviews` | `JwtAuthGuard`; `GET product/:productId` public (approved only) |
| `cart` | reads/writes | `OptionalJwtAuthGuard`; `POST /cart/merge` is `JwtAuthGuard` |

Ownership is scoped in the query (`findAll(user.id, …)`, `findByNumber(number, user.id)`), so another account's ID reads as 404. **No unguarded customer route was found.**

### Guest checkout

- `guest_checkout_enabled` is enforced server-side in `orders.service.create()` before anything else.
- `POST /orders` requires a guest to supply `guestPhone` or `guestEmail`, with the reason documented in the code.
- `CreateOrderDto` accepts an inline `address` object so a guest can complete checkout without a saved address.
- The storefront sends `guestPhone` from the delivery address when no user is present (`checkout-client.tsx:236`).

### Order tracking

`POST /orders/track/:number` + `contact`. POST rather than GET so the contact stays out of URLs and access logs. `contactMatches()` compares emails case-insensitively and phones on the last 10 digits, so `+92 300 1234567` / `0300-1234567` / `03001234567` all match. A miss throws the same `NotFoundException` as a bad order number, so the endpoint does not confirm an order exists. The response carries status, timeline, items and tracking number — **no address, no contact details**.

This is well built. The problem is that nothing in the storefront calls it.

---

## Issues Found

### 1. No route guards anywhere on the storefront — **critical**

`middleware.ts` is next-intl's middleware and nothing else:

```ts
export default createMiddleware(routing)
```

No account page checks auth either. `useAuthStore` appears in only six files across the whole app — `account/layout.tsx`, `account/profile/page.tsx`, the two auth forms, `checkout-client.tsx` and `review-form.tsx`. None of the six is a guard.

A signed-out visitor can open `/account`, `/account/orders`, `/account/wishlist`, `/account/addresses`, `/account/profile`, `/account/returns` and each renders. The API correctly returns 401, so no data leaks — but the customer sees an error panel rather than a sign-in prompt.

### 2. The account sidebar fabricates an identity — **critical**

`account/layout.tsx:28-30`:

```ts
const displayName  = user?.name  ?? 'Guest User'
const displayEmail = user?.email ?? 'guest@yalahaji.com'
```

A signed-out visitor is shown an avatar reading **GU**, the name **Guest User**, and the email **guest@yalahaji.com** — an address that does not exist. This is the exact pattern `PROJECT_SPEC.md` → *UI/UX Standards → Honesty* prohibits, and the same shape as the `address.fullName || 'Muhammad Ali'` bug that was already removed from checkout once.

It also renders a **Sign Out** button for someone who was never signed in.

### 3. 401 renders as a generic error, never as "please sign in" — **high**

`ApiError.isAuthError` exists (`client.ts:55`) but nothing outside `auth.ts`'s `hydrate()` consumes it. A guest on `/account/orders` gets "Could not load your orders" with a Retry button that will fail identically forever. Same on addresses and returns.

### 4. The wishlist is device-local and never reaches the account — **high**

`store/wishlist.ts` is a Zustand store persisted to `localStorage` under `yalahaji-wishlist`. The API wishlist endpoints (`GET/POST/DELETE /users/me/wishlist`) are wrapped in `lib/api/auth.ts` as `fetchWishlistIds` / `addToWishlist` / `removeFromWishlist` and **exported from `lib/api/index.ts` — but no component imports any of them.**

Consequences:

- The wishlist works for guests, contradicting `PROJECT_SPEC.md` → *Authentication required for: … Wishlist*.
- Signing in does not merge the local wishlist the way the cart is merged.
- A customer's saved items do not follow them to another device, and clearing browser storage loses them silently.

This is the largest single gap between the spec and the code, and it needs a decision before Phase 2 (see *Conflicts*).

### 5. There is no order-tracking page — **high**

`trackOrder()` exists in `lib/api/orders.ts:97` and is exported from `lib/api/index.ts:85`. **No component calls it.** There is no `/track-order` route in `app/[locale]/`.

Every "track your order" affordance points at an authenticated page instead:

| Surface | Links to | Works for a guest? |
|---|---|---|
| `footer.tsx:68` — "Track Order" | `/account/orders` | No |
| `checkout-client.tsx:284` — "Track My Order" on the success screen | `/account/orders` | No |

The second is the worst of the two: a guest has just placed an order, is handed their order number, clicks the button offered to them, and lands on a page that cannot work. The backend requirement is already met — the missing piece is entirely storefront.

### 6. `guest_checkout_enabled` is never read by the UI — **medium**

`adapters.ts:454` maps it and `catalog.ts:195` defaults it to `true`, but no component reads `guestCheckoutEnabled`. With the flag off, a guest fills in the whole checkout and is rejected at the final step by the server. Correct outcome, wasteful path — they should be asked to sign in before entering an address.

### 7. Guest checkout collects a phone but never an email — **medium**

`checkout-client.tsx:236` sends `guestPhone` only; `guestEmail` appears in the storefront exclusively as a type field (`lib/api/orders.ts:36`). Phase 2 calls for tracking by *number + email* **or** *number + phone*. Tracking by email can never succeed for a guest order placed through this UI, because no guest order has a `guestEmail`.

### 8. Navigation is identical for guests and signed-in customers — **medium**

`header.tsx` does not import `useAuthStore` at all. It renders a wishlist link and an account link unconditionally — no Sign In, no Sign Out, no name, no Track Order. `mobile-bottom-bar.tsx` does the same. A signed-out visitor gets no route to `/login` from the header on any breakpoint.

### 9. Login always returns to `/account`, discarding the intended destination — **medium**

`login-form.tsx:49` and `register-form.tsx:63` both hard-code `router.push('/${locale}/account')`. There is no `?next=` parameter, so once guards are added in Phase 2 a customer bounced off `/account/returns` will be dropped on their order list instead of the page they asked for.

### 10. Account UI is not internationalised — **low, but out of standard**

`account/layout.tsx` hard-codes `'My Orders'`, `'Wishlist'`, `'Addresses'`, `'Profile'`, `'Returns'`, `'Sign Out'`, `'My Account'`. The order pages hard-code the status labels. `PROJECT_SPEC.md` requires all customer-facing strings to go through next-intl. Worth folding into Phase 2 since these files are being touched anyway — but it is scope beyond the guest brief, so flagging rather than assuming.

---

## Conflicts

**Wishlist: local store vs. API endpoints.** Two complete implementations exist and disagree. `store/wishlist.ts` (used) says the wishlist is a guest-accessible device-local list. `users.controller.ts` + the three unused API wrappers say it is an authenticated server-side list. `PROJECT_SPEC.md` sides with the API. Phase 2 cannot proceed on this until one is chosen — the options are (a) require login and switch to the API, discarding local ids or merging them on sign-in like the cart, or (b) keep it local for guests and sync on login, which means amending the spec. **This needs your decision.**

**Footer "Track Order" vs. the tracking endpoint.** The footer promises a capability the API supports and the UI does not expose, and resolves the promise to a login wall.

**Spec says returns are auth-only; two routes named "returns" exist.** `/returns` is the public policy page (correct, `PolicyPage`) and `/account/returns` is the authenticated request form. Not a bug, but the naming makes a guard audit easy to get wrong — worth a note in `PROJECT_SPEC.md`.

**`isHydrating` is consumed in exactly one place.** `review-form.tsx:71` gates on it correctly. No account page does, so any guard added in Phase 2 must gate on it too — checking `user === null` before hydration finishes would bounce a signed-in customer to the login page on every hard refresh.

---

## Security Concerns

Ranked. Nothing here is an active data leak.

**1. No confidentiality breach was found.** Account pages render for guests, but every one of them sources its data from a guarded endpoint, so the API returns 401 and the page shows an error. The exposure is cosmetic and reputational, not a data leak. Worth stating plainly because issue #1 reads worse than it is.

**2. Order-number enumeration against a known contact — low/moderate.** Order numbers are sequential (`YH-<year>-<n>` from 1001), so the number is guessable by design. `POST /orders/track/:number` is throttled at 10/min per the decorator. An attacker who already knows a victim's email or phone can walk the number space at 600/hour to find their orders, then read status, items, totals and timeline. Mitigations already in place: no address or contact detail in the response, and an identical `NotFoundException` for a wrong number and a wrong contact. Suggested hardening — throttle on the *contact* as well as the route, and consider a short lockout after N consecutive misses. Not a Phase 2 blocker.

**3. Tracking matches on the account holder's email/phone too.** `contactMatches()` checks `order.user.email` and `order.user.phone` alongside the guest fields, so an authenticated customer's order is reachable through the public endpoint given their number and email. This is probably intended — a customer who ordered while signed in still expects to be able to track without logging in — but it is worth recording as a deliberate decision rather than leaving it implicit.

**4. Token in `localStorage` is XSS-readable.** Documented with a rationale in `token.ts` (the customer strategy reads a bearer header; admin uses httpOnly cookies). Not a regression and not in scope, noted for completeness.

**5. No server-side guard is possible for account routes as currently designed.** The token lives in `localStorage`, which middleware cannot read, so Phase 2 guards will necessarily be client-side. That is acceptable here because the API is the real boundary and account pages have no SEO value — the comment at `account/orders/page.tsx:39` already makes this argument. Recording it so the choice is not mistaken for an oversight later.

---

## UX Improvements

Ordered by value per unit of work.

1. **Build `/track-order`.** The endpoint, the client wrapper and the export all exist; this is a form and a result panel. It unblocks the guest journey end to end and is the highest-value item in the audit.
2. **Point the two existing "track" links at it** — the checkout success screen and the footer — and give the success screen the order number in a copyable form.
3. **Replace the fabricated guest identity with a real guest dashboard.** Title "Guest Checkout", body "You checked out as a guest.", actions Track Your Order / Sign In / Create Account, plus the account benefits. Removes issue #2 and satisfies the Phase 2 requirement in one change.
4. **Add a friendly login redirect for the six protected routes**, gated on `isHydrating`, carrying `?next=`, and honoured by both auth forms.
5. **Make the header auth-aware** — Sign In / Create Account / Track Order for guests; name, account links and Sign Out for customers. Mirror it in the mobile bottom bar.
6. **Collect an optional email at guest checkout** and send it as `guestEmail`, so tracking by email works as specified.
7. **Read `guestCheckoutEnabled` at the top of checkout** and show the sign-in prompt up front instead of failing at submit.
8. **Distinguish 401 from a genuine error** on every account screen — "Please sign in to see your orders" with a Sign In button, not "Retry".
9. **Resolve the wishlist conflict**, then make the heart icon tell a guest what will happen ("Sign in to save this" or "Saved on this device").
10. **Internationalise the account area** while it is open.

---

## Recommended Phase 2 order

1. Decide the wishlist question — it changes the shape of items 3, 5 and 9.
2. `/track-order` page + relink the two entry points.
3. Guard component (`isHydrating`-aware, `?next=`-carrying) applied to the six routes.
4. Guest dashboard replacing the fabricated identity.
5. Auth-aware header and mobile bar.
6. Guest email at checkout; `guestCheckoutEnabled` read in the UI.
7. 401-aware empty states.
8. i18n sweep of the account area.

Steps 2–5 are the ones a customer would notice. No backend change is required for any of them.

---

## Open questions

1. **Wishlist** — require login and merge on sign-in like the cart, or keep it device-local for guests and amend `PROJECT_SPEC.md`?
2. **Guest email at checkout** — optional field, or required-one-of alongside phone?
3. **i18n of the account area** — fold into Phase 2, or split into its own task?
