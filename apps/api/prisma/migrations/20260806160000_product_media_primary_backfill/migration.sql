-- ─────────────────────────────────────────────────────────────
-- Guarantee every photographed product has exactly one primary image
--
-- No schema change. This repairs data so two existing queries stop lying.
--
-- Why it matters:
--   * `cart.service.ts` selects product images with
--     `where: { isPrimary: true }, take: 1` — a product whose rows all have
--     `is_primary = 0` contributes no image to the cart at all, and the
--     customer reviews their basket against blank placeholders.
--   * `products.service.ts` does the same for kit contents.
--   * The storefront adapter now sorts primary-first, so a product with two
--     primaries has no defined "main" photo.
--
-- Until now the only writer was the seed, which sets the flag correctly. The
-- admin panel gaining a media manager means arbitrary lists can be saved, so
-- `normaliseMedia()` in products.service.ts enforces this on every write from
-- here on. This migration fixes whatever predates it.
--
-- Both statements are idempotent: re-running them changes nothing once the
-- invariant holds.
-- ─────────────────────────────────────────────────────────────

-- 1. Demote extra primaries, keeping the lowest `order` (then oldest) as the
--    winner. Without this a product with two flagged rows stays ambiguous.
UPDATE `product_media` AS m
JOIN (
  SELECT
    p.`productId` AS product_id,
    (
      SELECT k.`id`
      FROM `product_media` k
      WHERE k.`productId` = p.`productId` AND k.`isPrimary` = 1
      ORDER BY k.`order` ASC, k.`createdAt` ASC, k.`id` ASC
      LIMIT 1
    ) AS keep_id
  FROM `product_media` p
  WHERE p.`isPrimary` = 1
  GROUP BY p.`productId`
  HAVING COUNT(*) > 1
) AS dupes ON dupes.product_id = m.`productId`
SET m.`isPrimary` = 0
WHERE m.`isPrimary` = 1 AND m.`id` <> dupes.keep_id;

-- 2. Promote the first image of any product that has photos but no primary.
UPDATE `product_media` AS m
JOIN (
  SELECT
    p.`productId` AS product_id,
    (
      SELECT k.`id`
      FROM `product_media` k
      WHERE k.`productId` = p.`productId`
      ORDER BY k.`order` ASC, k.`createdAt` ASC, k.`id` ASC
      LIMIT 1
    ) AS first_id
  FROM `product_media` p
  GROUP BY p.`productId`
  HAVING SUM(p.`isPrimary` = 1) = 0
) AS missing ON missing.product_id = m.`productId`
SET m.`isPrimary` = 1
WHERE m.`id` = missing.first_id;
