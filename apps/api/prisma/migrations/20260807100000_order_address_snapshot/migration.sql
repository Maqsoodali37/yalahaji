-- ─────────────────────────────────────────────────────────────
-- Freeze the delivery address onto the order
--
-- `orders.addressId` pointed at a live `addresses` row, so an order rendered
-- whatever that row said *today*, not what it said when the parcel was sent.
-- A customer moving house and editing their saved address silently rewrote the
-- delivery address on every order they had ever placed — including delivered
-- ones, whose recorded destination is the only evidence of where the goods
-- actually went. Support reading an old order saw the new address; a dispute
-- about a misdelivery had no record left to argue from.
--
-- The fix is a snapshot: the address fields are copied onto the order at
-- checkout and never touched again. `addressId` is kept — it still answers
-- "which saved address did they pick", which is useful for a repeat-order
-- suggestion — but nothing reads through it for display any more.
--
-- Columns rather than a JSON blob: the admin order screen filters on
-- city/province, and those filters currently reach the address through a
-- relation. Real columns let that filter move onto `orders` unchanged, where
-- a JSON column would have needed the filter rewritten and un-indexed.
--
-- Every column is nullable so the ALTER does not rewrite the table under a
-- NOT NULL default, and the backfill below fills them for existing rows. A
-- guest order whose address row was never created (there are none, but the FK
-- is nullable) simply keeps NULLs, which the storefront already renders as an
-- empty address block rather than crashing.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE `orders`
  ADD COLUMN `shippingLabel` VARCHAR(191) NULL,
  ADD COLUMN `shippingFullName` VARCHAR(191) NULL,
  ADD COLUMN `shippingPhone` VARCHAR(191) NULL,
  ADD COLUMN `shippingEmail` VARCHAR(191) NULL,
  ADD COLUMN `shippingAddressLine1` VARCHAR(191) NULL,
  ADD COLUMN `shippingAddressLine2` VARCHAR(191) NULL,
  ADD COLUMN `shippingArea` VARCHAR(191) NULL,
  ADD COLUMN `shippingCity` VARCHAR(191) NULL,
  ADD COLUMN `shippingProvince` VARCHAR(191) NULL,
  ADD COLUMN `shippingPostalCode` VARCHAR(191) NULL;

-- `area` is a real part of a Pakistani address (Gulberg, DHA Phase 5, Saddar)
-- that customers were previously cramming into addressLine2 alongside the
-- landmark. `email` is optional and per-address rather than per-account: the
-- person receiving a parcel at the office is not always the account holder.
ALTER TABLE `addresses`
  ADD COLUMN `area` VARCHAR(191) NULL,
  ADD COLUMN `email` VARCHAR(191) NULL;

-- Backfill in the same migration, because the new columns change how the order
-- is *read*: deploying the code without this would blank the delivery address
-- on every historical order at the moment the storefront started preferring
-- the snapshot.
--
-- `WHERE o.shippingFullName IS NULL` makes the UPDATE itself idempotent. Note
-- that the DDL above is not: MySQL 8 has no `ADD COLUMN IF NOT EXISTS` or
-- `CREATE INDEX IF NOT EXISTS`, so re-running this file by hand fails at the
-- first ALTER. That is fine — `prisma migrate deploy` never re-applies an
-- applied migration — but it means this file is not a repair script.
--
-- All ten columns are copied, including `area` and `email`. They are NULL on
-- every existing row (the ALTER above created them moments ago), so this is
-- symmetry rather than data movement — but leaving them out of the SET list
-- would silently drop real data the day someone splits these two ALTERs into
-- separate migrations.
UPDATE `orders` o
  JOIN `addresses` a ON a.`id` = o.`addressId`
  SET
    o.`shippingLabel`        = a.`label`,
    o.`shippingFullName`     = a.`fullName`,
    o.`shippingPhone`        = a.`phone`,
    o.`shippingEmail`        = a.`email`,
    o.`shippingAddressLine1` = a.`addressLine1`,
    o.`shippingAddressLine2` = a.`addressLine2`,
    o.`shippingArea`         = a.`area`,
    o.`shippingCity`         = a.`city`,
    o.`shippingProvince`     = a.`province`,
    o.`shippingPostalCode`   = a.`postalCode`
  WHERE o.`shippingFullName` IS NULL;

-- The admin order list filters by city and province. Those filters move from
-- the joined `addresses` table onto these columns, so they need an index of
-- their own or the screen starts full-scanning `orders`.
CREATE INDEX `orders_shippingCity_idx` ON `orders`(`shippingCity`);
CREATE INDEX `orders_shippingProvince_idx` ON `orders`(`shippingProvince`);
