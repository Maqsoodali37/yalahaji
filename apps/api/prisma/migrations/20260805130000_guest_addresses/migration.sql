-- ─────────────────────────────────────────────────────────────
-- Allow guest delivery addresses
--
-- `Order.addressId` is required, but a guest has no account to hang a saved
-- address off and `/users/me/addresses` is behind the customer guard — so
-- guest checkout could never complete, despite `guestEmail` / `guestPhone`
-- existing on orders for exactly that flow.
--
-- Making `addresses.userId` nullable lets an inline address supplied at
-- checkout be persisted and referenced by the order.
--
-- Widening a NOT NULL column to NULL does not rewrite existing rows and
-- cannot fail on existing data, so no backfill is needed.
-- ─────────────────────────────────────────────────────────────

-- The foreign key must be dropped before the column can be modified, then
-- recreated. ON DELETE CASCADE is preserved: deleting a user still removes
-- their saved addresses, while guest addresses (userId IS NULL) are unaffected.
ALTER TABLE `addresses` DROP FOREIGN KEY `addresses_userId_fkey`;

ALTER TABLE `addresses` MODIFY `userId` VARCHAR(191) NULL;

ALTER TABLE `addresses`
  ADD CONSTRAINT `addresses_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
