-- Unguessable order numbers
--
-- WHY
--
-- Order tracking is moving to "order number only" — the customer types one
-- field, no email or phone. That is a real usability win, but it makes the
-- order number the entire credential, and the existing scheme cannot carry
-- that weight: `YH-2026-1001`, `1002`, `1003` … is walkable by hand. Shipping
-- number-only tracking against sequential numbers would expose every order's
-- items, totals, status and timeline to an anonymous caller.
--
-- So each number gains a random six-character suffix:
--
--     YH-2026-1001   ->   YH-2026-1001-K7QX9M
--
-- The sequence is kept because operations and support read it, and it still
-- sorts correctly. The suffix is what makes the number unguessable: 32^6 is
-- about 1.07e9 combinations against a 5-per-minute throttle.
--
-- BACKFILL
--
-- Historical rows must be migrated in the same change. A single order left on
-- the old format is a publicly readable order the moment the new endpoint
-- ships — the backfill is not tidiness, it is the point.
--
-- The alphabet is Crockford Base32 (no I, L, O or U) so a customer reading the
-- number off a WhatsApp message cannot confuse it with 1 or 0. It is repeated
-- inline rather than held in a user variable because each statement in a
-- migration may run on its own connection.
--
-- RAND() is evaluated per row per occurrence in MySQL, so the six calls below
-- yield six independent characters. RAND() is not cryptographically strong —
-- acceptable here because these are existing orders whose numbers have already
-- been shared over WhatsApp and email, so the token is raising the floor for
-- historical rows rather than protecting a secret that was ever secret. Newly
-- created orders use crypto.randomInt in orders.service.ts.
--
-- The WHERE clause makes this re-runnable: a row that already carries a
-- six-character token is left alone, so a partially applied migration can be
-- repeated without stacking a second suffix onto it.

UPDATE `orders`
SET `number` = CONCAT(
  `number`, '-',
  SUBSTRING('0123456789ABCDEFGHJKMNPQRSTVWXYZ', FLOOR(RAND() * 32) + 1, 1),
  SUBSTRING('0123456789ABCDEFGHJKMNPQRSTVWXYZ', FLOOR(RAND() * 32) + 1, 1),
  SUBSTRING('0123456789ABCDEFGHJKMNPQRSTVWXYZ', FLOOR(RAND() * 32) + 1, 1),
  SUBSTRING('0123456789ABCDEFGHJKMNPQRSTVWXYZ', FLOOR(RAND() * 32) + 1, 1),
  SUBSTRING('0123456789ABCDEFGHJKMNPQRSTVWXYZ', FLOOR(RAND() * 32) + 1, 1),
  SUBSTRING('0123456789ABCDEFGHJKMNPQRSTVWXYZ', FLOOR(RAND() * 32) + 1, 1)
)
WHERE `number` REGEXP '^YH-[0-9]{4}-[0-9]+$';

-- A collision would have failed the UPDATE on the unique index rather than
-- silently pairing two orders, so reaching here means every row is distinct.
-- Numbers are now up to 20 characters against a 191-character column, so no
-- column change is required.
