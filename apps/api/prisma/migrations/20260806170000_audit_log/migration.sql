-- ─────────────────────────────────────────────────────────────
-- Audit log
--
-- Generic, not scoped to one entity: `entityType` is free text rather than an
-- enum so a later caller (orders, coupons, …) needs no migration to start
-- writing here. The first caller is store settings — those rows decide what
-- customers are charged, so "who changed this and from what" has to be
-- answerable, and there was previously no record of it at all.
--
-- `actorName`/`actorRole` are captured at write time rather than joined from
-- `users` on read, because a staff account can be renamed or re-roled later
-- and the log should still say who did this and what they were at the time.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `actorName` VARCHAR(191) NOT NULL,
    `actorRole` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `audit_logs_actorId_idx`(`actorId`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
