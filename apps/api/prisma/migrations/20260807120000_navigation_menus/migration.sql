-- ─────────────────────────────────────────────────────────────
-- Navigation menus
--
-- The storefront's header, mega menu, mobile drawer and footer each carried
-- their own hardcoded array of links (`NAV_LINKS` in header.tsx, `MEGA_DATA`
-- in mega-menu.tsx, four inline arrays in footer.tsx). They disagreed:
-- "Dates & Zam Zam" was in the footer and not the header, the mega menu
-- pointed at `/shop/ihram-men` and `/shop/ihram-women`, neither of which is a
-- category that exists. Changing the navigation meant a deploy, and adding a
-- category meant remembering four files.
--
-- Modelled as its own pair of tables rather than as `settings` rows: a menu is
-- an ordered, nestable list whose items each carry a link target, a schedule,
-- an audience and a layout. A key/value store can only hold that as one opaque
-- JSON blob, which nothing can reorder, validate or query.
--
-- `menu_items.parent_id` is a self-relation with no depth cap, mirroring
-- `categories.parentId`. As there, the tree is assembled in memory from one
-- flat SELECT rather than by nested Prisma includes, which silently truncate.
--
-- Everything here is new — no existing row is touched, nothing to backfill.
-- The one change to an existing table is `users.customer_group`, which is
-- NOT NULL with a default, so existing accounts become `retail` (what they
-- already effectively were) with no separate backfill statement.
-- ─────────────────────────────────────────────────────────────

-- Customer group. Gates the `wholesale` / `retail` menu visibility rules.
-- Deliberately not settable from the customer signup flow — staff assign it.
ALTER TABLE `users`
  ADD COLUMN `customer_group` ENUM('retail', 'wholesale') NOT NULL DEFAULT 'retail';

-- One menu per location. `location` is UNIQUE because
-- `GET /menus/location/:location` has to be unambiguous, and "two active
-- header menus" is a state with no correct resolution.
CREATE TABLE `menus` (
  `id`         VARCHAR(191) NOT NULL,
  `location`   ENUM('header', 'footer', 'mobile', 'sidebar', 'mega') NOT NULL,
  `name`       VARCHAR(191) NOT NULL,
  `isActive`   BOOLEAN NOT NULL DEFAULT true,
  `cache_ttl`  INTEGER NOT NULL DEFAULT 300,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `menus_location_key`(`location`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `menu_items` (
  `id`        VARCHAR(191) NOT NULL,
  `menu_id`   VARCHAR(191) NOT NULL,
  `parent_id` VARCHAR(191) NULL,

  -- Per-locale, flat, mirroring `categories.nameEn/Ur/Ar`. Ur/Ar are NULL-able
  -- so a missing translation is a fallback at render time rather than a reason
  -- staff cannot save the row.
  `titleEn` VARCHAR(191) NOT NULL,
  `titleUr` VARCHAR(191) NULL,
  `titleAr` VARCHAR(191) NULL,

  `link_type`   ENUM('category', 'product', 'cms_page', 'brand', 'collection', 'custom', 'external', 'heading') NOT NULL DEFAULT 'custom',
  `target_slug` VARCHAR(191) NULL,
  `target_id`   VARCHAR(191) NULL,
  -- TEXT, not VARCHAR(191): an external URL with campaign parameters passes
  -- 191 characters routinely, and a silently truncated href is a broken link
  -- nobody notices until a customer reports it.
  `url` TEXT NULL,

  `icon`  VARCHAR(191) NULL,
  `image` VARCHAR(191) NULL,

  `badgeEn` VARCHAR(191) NULL,
  `badgeUr` VARCHAR(191) NULL,
  `badgeAr` VARCHAR(191) NULL,

  `order`     INTEGER NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,

  `visibility` ENUM('everyone', 'guest', 'customer', 'wholesale', 'retail') NOT NULL DEFAULT 'everyone',
  `device`     ENUM('all', 'desktop', 'mobile') NOT NULL DEFAULT 'all',

  -- Filtered at read time, not at publish time, so a seasonal item starts and
  -- stops on its own.
  `publish_from`  DATETIME(3) NULL,
  `publish_until` DATETIME(3) NULL,

  `is_mega_menu` BOOLEAN NOT NULL DEFAULT false,
  `mega_layout`  ENUM('columns', 'columns_with_banner', 'featured_grid', 'columns_with_products') NULL,
  `mega_columns` INTEGER NOT NULL DEFAULT 4,
  `mega_config`  JSON NULL,

  `rel_attribute`   VARCHAR(191) NULL,
  `no_follow`       BOOLEAN NOT NULL DEFAULT false,
  `open_in_new_tab` BOOLEAN NOT NULL DEFAULT false,

  `titleAttrEn` VARCHAR(191) NULL,
  `titleAttrUr` VARCHAR(191) NULL,
  `titleAttrAr` VARCHAR(191) NULL,

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  -- Every tree read selects by menu and sorts siblings by (parent_id, order)
  -- together; a single-column index on menu_id would make MySQL sort each
  -- sibling group after the fact.
  INDEX `menu_items_menu_id_parent_id_order_idx`(`menu_id`, `parent_id`, `order`),
  INDEX `menu_items_parent_id_idx`(`parent_id`),
  -- The public read filters on all three at once.
  INDEX `menu_items_is_active_publish_from_publish_until_idx`(`is_active`, `publish_from`, `publish_until`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CASCADE on both, and for different reasons:
--   menu_id   — deleting a menu should take its items; there is nothing an
--               orphaned item could belong to.
--   parent_id — deleting a parent item takes its whole subtree. RESTRICT
--               (Prisma's default) would refuse the delete with a raw foreign
--               key error, and SET NULL would silently promote every child to
--               a top-level nav entry, which is worse than either.
ALTER TABLE `menu_items`
  ADD CONSTRAINT `menu_items_menu_id_fkey`
    FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `menu_items`
  ADD CONSTRAINT `menu_items_parent_id_fkey`
    FOREIGN KEY (`parent_id`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
