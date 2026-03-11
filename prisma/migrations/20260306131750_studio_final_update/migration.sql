/*
  Warnings:

  - You are about to drop the column `isSuccess` on the `video` table. All the data in the column will be lost.
  - You are about to drop the column `views` on the `video` table. All the data in the column will be lost.
  - Made the column `ctr` on table `video` required. This step will fail if there are existing NULL values in that column.
  - Made the column `avd` on table `video` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `video` DROP COLUMN `isSuccess`,
    DROP COLUMN `views`,
    ADD COLUMN `favorito` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `link` VARCHAR(191) NULL,
    MODIFY `ctr` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `avd` DOUBLE NOT NULL DEFAULT 0;
