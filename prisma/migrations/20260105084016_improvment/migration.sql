/*
  Warnings:

  - You are about to drop the column `fileType` on the `Planche` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Planche" DROP COLUMN "fileType";

-- DropEnum
DROP TYPE "FileType";
