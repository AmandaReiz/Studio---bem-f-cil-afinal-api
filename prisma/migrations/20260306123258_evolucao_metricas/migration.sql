/*
  Warnings:

  - You are about to drop the `videos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `videos`;

-- CreateTable
CREATE TABLE `Video` (
    `id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `tema` VARCHAR(191) NULL,
    `roteiro` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Roteiro',
    `ctr` DOUBLE NULL DEFAULT 0,
    `avd` DOUBLE NULL DEFAULT 0,
    `views` INTEGER NULL DEFAULT 0,
    `isSuccess` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
