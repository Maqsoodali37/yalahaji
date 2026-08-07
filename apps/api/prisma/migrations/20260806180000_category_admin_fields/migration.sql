-- ─────────────────────────────────────────────────────────────
-- Category admin fields
--
-- Building the admin Categories screen surfaced two problems with the
-- existing table:
--
-- 1. `CreateCategoryDto` already accepted `metaTitle`/`metaDesc`, but neither
--    column ever existed on `categories` — sending them threw a Prisma
--    "unknown argument" error at the database call, not a validation error a
--    caller could act on. They are replaced here with `seoTitleEn/Ur/Ar` and
--    `seoDescEn/Ur/Ar`, mirroring the `nameEn/Ur/Ar` per-locale convention
--    already used on this table rather than a separate translation table.
-- 2. There was no banner field, so the shop landing/category page header had
--    nowhere to source an image distinct from the tree thumbnail.
--
-- All additions are nullable — existing rows keep working with no backfill.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE `categories`
  ADD COLUMN `bannerImage` VARCHAR(191) NULL,
  ADD COLUMN `seoTitleEn` VARCHAR(191) NULL,
  ADD COLUMN `seoTitleUr` VARCHAR(191) NULL,
  ADD COLUMN `seoTitleAr` VARCHAR(191) NULL,
  ADD COLUMN `seoDescEn` TEXT NULL,
  ADD COLUMN `seoDescUr` TEXT NULL,
  ADD COLUMN `seoDescAr` TEXT NULL;

-- Every drag-and-drop reorder and every tree read filters/sorts by
-- (parentId, order) together; the existing single-column index on `parentId`
-- made MySQL sort the sibling group after the fact instead of reading it in
-- order.
CREATE INDEX `categories_parentId_order_idx` ON `categories`(`parentId`, `order`);
