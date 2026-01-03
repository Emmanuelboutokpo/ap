/*
  Warnings:

  - A unique constraint covering the columns `[name,catalogueId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `catalogueId` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Category_name_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "catalogueId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Catalogue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Catalogue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Catalogue_name_key" ON "Catalogue"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_catalogueId_key" ON "Category"("name", "catalogueId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_catalogueId_fkey" FOREIGN KEY ("catalogueId") REFERENCES "Catalogue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
