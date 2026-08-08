-- ─────────────────────────────────────────────────────────────
-- Per-locale SEO on products
--
-- `products` carried a single `metaTitle`/`metaDesc` pair while the shop
-- serves three locales, so an Urdu or Arabic product page could only ever be
-- indexed under its English title and description. `categories` already
-- solved this in 20260806180000_category_admin_fields with flat per-locale
-- columns mirroring `nameEn/Ur/Ar` — this brings `products` into line rather
-- than introducing a second, different SEO shape.
--
-- `seoKeywords*` is new to this codebase — categories have no equivalent. It
-- is TEXT rather than VARCHAR(191) because a keyword list is a comma-separated
-- set that grows, and a truncation here is a silent SEO regression, not a
-- visible one.
--
-- `metaTitle`/`metaDesc` are deliberately kept, not dropped:
--   * they are the English values' home for anything still reading them, and
--   * dropping a column is not reversible against a populated table.
-- They are backfilled into the English pair below so a product that already
-- had SEO does not lose it, and the backfill is guarded on IS NULL so
-- re-running against a partially-migrated database cannot overwrite authored
-- content with an older value.
--
-- All additions are nullable — existing rows survive with no data.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE `products`
  ADD COLUMN `seoTitleEn` VARCHAR(191) NULL,
  ADD COLUMN `seoTitleUr` VARCHAR(191) NULL,
  ADD COLUMN `seoTitleAr` VARCHAR(191) NULL,
  ADD COLUMN `seoDescEn` TEXT NULL,
  ADD COLUMN `seoDescUr` TEXT NULL,
  ADD COLUMN `seoDescAr` TEXT NULL,
  ADD COLUMN `seoKeywordsEn` TEXT NULL,
  ADD COLUMN `seoKeywordsUr` TEXT NULL,
  ADD COLUMN `seoKeywordsAr` TEXT NULL;

UPDATE `products`
SET `seoTitleEn` = `metaTitle`
WHERE `seoTitleEn` IS NULL AND `metaTitle` IS NOT NULL AND `metaTitle` <> '';

UPDATE `products`
SET `seoDescEn` = `metaDesc`
WHERE `seoDescEn` IS NULL AND `metaDesc` IS NOT NULL AND `metaDesc` <> '';
