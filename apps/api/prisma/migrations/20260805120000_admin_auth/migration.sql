-- ─────────────────────────────────────────────────────────────
-- Separate admin authentication
--   1. Brute-force counters on users
--   2. Rework `sessions` into revocable admin sessions
-- ─────────────────────────────────────────────────────────────

-- 1. Brute-force protection + last login tracking
ALTER TABLE `users`
  ADD COLUMN `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `lockedUntil`         DATETIME(3) NULL,
  ADD COLUMN `lastLoginAt`         DATETIME(3) NULL;

-- 2. Sessions: the old `token` column stored raw tokens and was never used.
--    Replace it with a SHA-256 hash column and add revocation support.
DROP INDEX `sessions_token_key` ON `sessions`;
DROP INDEX `sessions_token_idx` ON `sessions`;

-- No production rows exist for this table (it was never written to), so a
-- straight drop/add is safe and avoids a backfill.
ALTER TABLE `sessions`
  DROP COLUMN `token`,
  ADD COLUMN `tokenHash` VARCHAR(64) NOT NULL,
  ADD COLUMN `revokedAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `sessions_tokenHash_key` ON `sessions`(`tokenHash`);
CREATE INDEX `sessions_tokenHash_idx`        ON `sessions`(`tokenHash`);
CREATE INDEX `sessions_expiresAt_idx`        ON `sessions`(`expiresAt`);
