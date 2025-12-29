/*
  Warnings:

  - You are about to drop the column `isValidated` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_OTP', 'PENDING_MC_APPROVAL', 'ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isValidated",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING_OTP';
