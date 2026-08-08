-- ─────────────────────────────────────────────────────────────
-- Complete the saved-address shape
--
-- Follows 20260807100000_order_address_snapshot, which added `area`/`email`.
-- This adds the rest of the fields a saved address is meant to carry, and
-- splits the single default flag in two.
--
-- Three changes, each with a reason:
--
-- 1. `country`. The shop ships within Pakistan today and every value in
--    PROVINCES is Pakistani, so this is NOT NULL DEFAULT 'Pakistan' — the
--    column records what was true rather than asking the customer to restate
--    it on every form. It exists so that shipping abroad is a config change
--    rather than a migration against a populated orders table.
--
-- 2. `labelType`. The label was free text, so "Home", "home", "HOME" and
--    "Ammi's house" were four distinct labels and nothing could group or
--    filter on them. The enum is the structured answer; `label` stays as the
--    free-text display name for `other`, because dropping it would destroy
--    every custom label already saved.
--
-- 3. `isDefault` becomes `isDefaultShipping`, and `isDefaultBilling` joins it.
--    Nothing collects a billing address yet — cash on delivery is the only
--    enabled payment method — so the billing flag is currently write-only.
--    It is added now because the alternative is a second migration against
--    `addresses` at the moment a payment gateway lands, which is the worst
--    time to be altering the table every checkout reads.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE `addresses`
  ADD COLUMN `country` VARCHAR(191) NOT NULL DEFAULT 'Pakistan',
  ADD COLUMN `labelType` ENUM('home', 'office', 'other') NOT NULL DEFAULT 'home';

-- A rename, not an add-and-copy: the flag means exactly what it always meant,
-- and keeping both would leave two columns answering "is this the default"
-- with nothing to keep them in step.
ALTER TABLE `addresses`
  CHANGE COLUMN `isDefault` `isDefaultShipping` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `addresses`
  ADD COLUMN `isDefaultBilling` BOOLEAN NOT NULL DEFAULT false;

-- Derive the enum from what customers actually typed. Case- and
-- whitespace-insensitive, because the free-text column collected all of it.
-- Anything unrecognised becomes `other`, where the original string stays
-- visible in `label` rather than being flattened to a category it never was.
UPDATE `addresses`
  SET `labelType` = CASE
    WHEN LOWER(TRIM(`label`)) = 'home'   THEN 'home'
    WHEN LOWER(TRIM(`label`)) = 'office' THEN 'office'
    ELSE 'other'
  END;

-- The customer's existing default serves both until a gateway gives billing a
-- meaning of its own. Leaving billing unset instead would mean every account
-- has a shipping default and no billing default, which reads as broken rather
-- than as not-yet-used.
UPDATE `addresses`
  SET `isDefaultBilling` = `isDefaultShipping`
  WHERE `isDefaultShipping` = true;

-- The order snapshot has to carry the country too, or an order placed today
-- and read after the shop starts shipping abroad would render with no country
-- while its sibling rows have one.
ALTER TABLE `orders`
  ADD COLUMN `shippingCountry` VARCHAR(191) NULL;

-- Backfilled from the linked address, which the ALTER above has just defaulted
-- to 'Pakistan' for every existing row. Guarded so the statement is idempotent,
-- matching the previous migration.
UPDATE `orders` o
  JOIN `addresses` a ON a.`id` = o.`addressId`
  SET o.`shippingCountry` = a.`country`
  WHERE o.`shippingCountry` IS NULL;
