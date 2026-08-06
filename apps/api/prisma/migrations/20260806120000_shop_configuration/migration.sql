-- ─────────────────────────────────────────────────────────────
-- Shop configuration
--
-- Extends the existing `settings` table rather than adding a second config
-- table. Order totals are already computed from these rows
-- (`free_shipping_threshold`, `standard_shipping_cost`, `express_shipping_cost`
-- in OrdersService), so a parallel `shop_configurations` table would mean the
-- values staff edit and the values customers are charged against could drift
-- apart — with no error to signal it.
--
-- What this adds:
--   * `value_type`   — everything is stored as text; this says how to read it
--   * `category`     — grouping for the admin UI
--   * `description`  — so a key is not a guess for whoever edits it
--   * `is_public`    — replaces the hardcoded allowlist in settings.service.ts
--   * `created_at`   — the table only tracked updates
--
-- `is_public` defaults to FALSE so a newly inserted key is private until
-- someone deliberately publishes it. The backfill below re-publishes exactly
-- the four keys the old allowlist exposed, so behaviour is unchanged on deploy.
--
-- All additions are nullable or defaulted, so existing rows survive untouched.
-- ─────────────────────────────────────────────────────────────

-- Renamed to match the documented config schema. Safe: there is no raw SQL in
-- the codebase, and Prisma addresses these through the model, not the column
-- name. `key` was also a MySQL keyword needing quoting at every use.
ALTER TABLE `settings` RENAME COLUMN `key` TO `config_key`;
ALTER TABLE `settings` RENAME COLUMN `value` TO `config_value`;
ALTER TABLE `settings` RENAME COLUMN `updatedAt` TO `updated_at`;

ALTER TABLE `settings`
  ADD COLUMN `value_type` ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
  ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT 'general',
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `is_public` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- `is_public` is read on every storefront page load; `category` drives the
-- admin panel's grouping.
CREATE INDEX `settings_is_public_idx` ON `settings`(`is_public`);
CREATE INDEX `settings_category_idx` ON `settings`(`category`);

-- ── Backfill ────────────────────────────────────────────────────────────────
--
-- Classify the rows that already exist. Without this every pre-existing key
-- would sit at `string`/`general`/private, and the four the storefront depends
-- on would vanish from GET /settings/public the moment it stopped using its
-- hardcoded allowlist.

UPDATE `settings`
SET `value_type` = 'number',
    `category`   = 'shipping',
    `is_public`  = true,
    `description` = 'Order total (paisas) above which standard shipping is free'
WHERE `config_key` = 'free_shipping_threshold';

UPDATE `settings`
SET `value_type` = 'number',
    `category`   = 'shipping',
    `is_public`  = true,
    `description` = 'Standard delivery charge in paisas'
WHERE `config_key` = 'standard_shipping_cost';

UPDATE `settings`
SET `value_type` = 'number',
    `category`   = 'shipping',
    `is_public`  = true,
    `description` = 'Express delivery charge in paisas'
WHERE `config_key` = 'express_shipping_cost';

UPDATE `settings`
SET `value_type` = 'number',
    `category`   = 'checkout',
    `is_public`  = true,
    `description` = 'Gift wrap charge per item in paisas'
WHERE `config_key` = 'gift_wrap_price';

-- Deliberately left private: an internal contact number is not something the
-- storefront needs from this endpoint.
UPDATE `settings`
SET `value_type` = 'string',
    `category`   = 'store',
    `description` = 'WhatsApp number used for order notifications'
WHERE `config_key` = 'whatsapp_number';
