-- ─────────────────────────────────────────────────────────────
-- Kit builder categories
--
-- The "build your own kit" flow read its steps from a hardcoded file in the
-- storefront (`src/data/kit-categories.ts`), which grouped catalogue
-- categories by slug and filtered a bundled copy of the product list. That
-- made the flow invisible to the admin panel and silently wrong whenever a
-- category slug changed.
--
-- A kit step is not a `Category`: it can draw on several catalogue categories
-- at once (the "Abaya / Thobe" step covers both `abaya-hijab` and `thobe`) and
-- carries ordering, an icon and a required flag that have no meaning in the
-- catalogue tree. Hence a separate table plus a join, rather than extra
-- columns on `categories`.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `kit_categories` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameUr` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NOT NULL DEFAULT '',
    `required` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `kit_categories_slug_key`(`slug`),
    INDEX `kit_categories_isActive_order_idx`(`isActive`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kit_category_sources` (
    `id` VARCHAR(191) NOT NULL,
    `kitCategoryId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    -- One catalogue category can only be attached to a given kit step once;
    -- without this a duplicated link would list the same products twice.
    UNIQUE INDEX `kit_category_sources_kitCategoryId_categoryId_key`(`kitCategoryId`, `categoryId`),
    INDEX `kit_category_sources_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CASCADE on both sides: deleting a kit step should take its links with it,
-- and a deleted catalogue category must not leave a link pointing at nothing
-- for the storefront to dereference.
ALTER TABLE `kit_category_sources`
  ADD CONSTRAINT `kit_category_sources_kitCategoryId_fkey`
  FOREIGN KEY (`kitCategoryId`) REFERENCES `kit_categories`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `kit_category_sources`
  ADD CONSTRAINT `kit_category_sources_categoryId_fkey`
  FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
