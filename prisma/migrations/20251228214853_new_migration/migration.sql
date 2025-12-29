/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `Planche` table. All the data in the column will be lost.
  - You are about to drop the `ChantAudio` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChantAudio" DROP CONSTRAINT "ChantAudio_plancheId_fkey";

-- AlterTable
ALTER TABLE "Planche" DROP COLUMN "fileUrl",
ADD COLUMN     "audioFiles" TEXT[],
ADD COLUMN     "files" TEXT[];

-- DropTable
DROP TABLE "ChantAudio";
