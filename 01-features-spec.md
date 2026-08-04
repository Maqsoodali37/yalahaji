# Yala Haji — Custom Platform Feature & Functionality Spec

Based on: yalahaji.com audit + competitor review (Munawer.pk, IbneZafar.com)
Scope: Full feature list for custom-built e-commerce platform (storefront + admin)

---

## 1. Storefront — Catalog & Product Discovery

- Category & sub-category navigation (mega menu): Kits, Ihram (Men/Women/Kids), Abaya & Hijab, Fragrances/Attar, Tabaruk & Gifts, Prayer Accessories (Tasbeeh, Janamaz), Travel Accessories, Thobe, Dates & Zam Zam
- Product listing page with:
  - Grid/list view toggle, adjustable items-per-page
  - Filters: price range, category, size, color, scent, tier (Economy/Standard/Premium), rating, availability
  - Sort: popularity, newest, price, rating
  - Quick filter chips: Top Rated / On Sale / New Arrivals
- Search with autosuggest + trending searches
- Product Quick View modal (preview without full page load)
- Wishlist (save for later)
- "Add to Compare" (side-by-side comparison, esp. for kits)
- Product card: image, name, price (+ strikethrough sale price), star rating, badges (Hot/Sale/New)

## 2. Storefront — Product Detail Page (PDP)

- Image gallery + zoom, video support
- Variant selection (size/color/scent/tier) with live price/stock update
- Tier attribute (Economy/Standard/Premium) available store-wide — applicable to any product, not limited to kits
- Stock status incl. "low stock" and "notify me when back in stock"
- Size guide (abaya, ihram) — fabric, breathability, fit notes
- Kit contents breakdown (itemized list of what's included, esp. for bundled kits)
- Bundle/combo builder ("build your own Umrah kit")
- Verified customer reviews with photos/videos, rating breakdown
- Related products / frequently bought together
- Gift wrap + gift message option
- Share to WhatsApp/social
- SKU display (YH-[CATEGORY]-[ITEM]-[###])

## 3. Cart & Checkout

- Persistent cart (guest + logged-in, synced across devices)
- Free-shipping progress bar ("Spend ₨X more for free shipping")
- Coupon/promo code field, stackable category-specific offers
- Guest checkout + account checkout
- Address book (save multiple addresses)
- Shipping options: standard, express, COD
- Payment methods: JazzCash, Easypaisa, bank transfer, credit/debit card (Stripe/PayFast), Cash on Delivery
- "Open/Check First Then Pay" COD trust option
- Order summary with tax/shipping breakdown before payment
- Abandoned cart recovery (email/SMS/WhatsApp)

## 4. Account & Order Management

- Register/login (email, phone, social login)
- Order history + reorder
- Order tracking page (status timeline: placed → packed → shipped → delivered)
- Downloadable invoices
- Saved wishlist, saved addresses, saved payment methods
- Return/refund request flow from order history

## 5. Trust & Social Proof

- Verified reviews (photo/video upload)
- Google Reviews widget/rating badge
- UGC video testimonial wall
- Audio/text testimonials
- Trust badges: Free Shipping, Easy Returns, Excellent Service, Secure Payment
- Physical store address + multiple WhatsApp numbers in footer
- Live WhatsApp chat bubble (pre-filled message)
- FAQ page with schema markup

## 6. Content & SEO

- Blog/CMS (Hajj/Umrah guides, packing checklists, seasonal content)
- SEO-optimized category & product pages (meta, schema, structured FAQ)
- Multi-language support (English / Urdu / Arabic)
- Printed packing checklist bundled with physical kit orders
- Newsletter signup (with spam protection)

## 7. Retention & Growth

- Loyalty/points program
- Referral program
- Coupon engine (site-wide, category, first-order, seasonal/Ramadan campaigns)
- Back-in-stock and price-drop alerts
- Personalized recommendations (browsing/purchase history)

## 8. Category-Specific Features

- Kit builder/customizer (assemble your own Hajj/Umrah kit from modular items)
- Fragrance sample/trial size options
- Ihram fabric/purity specs (alcohol-free, unstitched compliance notes)
- Seasonal countdown banner (Hajj season, Ramadan Umrah packages)
- Pre-order support for seasonal high-demand items

---

## 9. Admin / Dashboard — Core Operations

- Product management: CRUD, bulk import/export (CSV), variant/SKU management, bulk price updates
- Inventory management: stock levels, low-stock alerts, multi-warehouse support (if applicable)
- Order management: status updates, order editing, refunds/cancellations, printable packing slips & shipping labels
- Customer management: profiles, order history per customer, segmentation (VIP, repeat, at-risk)
- Coupon/discount management: create/schedule/expire promotions
- Category/taxonomy management
- Returns/refund workflow with approval steps

## 10. Admin — Marketing & Content

- Blog/CMS content editor
- Homepage/banner scheduling (seasonal campaigns)
- Email/SMS/WhatsApp campaign builder + abandoned cart automation
- Review moderation queue
- SEO fields per product/category (meta title/description, schema)

## 11. Admin — Analytics & Reporting

- Sales dashboard (revenue, orders, AOV, by category/product/date range)
- Inventory reports (fast/slow movers, stockouts)
- Customer analytics (LTV, repeat rate, acquisition source)
- Marketing performance (coupon usage, campaign ROI)
- Exportable reports (CSV/PDF)

## 12. Admin — Access & Operations

- Role-based access control (Admin, Manager, Support, Fulfillment)
- Activity/audit log
- Shipping carrier integration & label generation
- Payment gateway reconciliation dashboard
- Multi-currency support (if expanding beyond Pakistan)

---

## Reference: Competitor Feature Benchmark

| Feature | Munawer.pk | IbneZafar.com | Yala Haji (current) |
|---|---|---|---|
| Wishlist | ✅ | ✅ | ❌ |
| Compare products | ✅ | — | ❌ |
| Order tracking page | — | ✅ | ❌ |
| Quick View | ✅ | — | ❌ |
| WhatsApp chat | ✅ | ✅ | ❌ |
| Google reviews widget | ✅ | — | ❌ |
| Free-shipping progress bar | — | ✅ | ❌ |
| Grid/list view toggle | — | ✅ | ❌ |
| Loyalty program | ❌ | ❌ | ❌ (opportunity) |
| Size guide | ❌ | ❌ | ❌ (opportunity) |
| Multi-language | ❌ | ❌ | ❌ (opportunity) |
