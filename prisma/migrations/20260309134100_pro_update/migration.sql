-- AlterTable
ALTER TABLE `video` ADD COLUMN `dificuldade` VARCHAR(191) NOT NULL DEFAULT 'Médio',
    ADD COLUMN `thumbnail` VARCHAR(191) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'Ideia';
