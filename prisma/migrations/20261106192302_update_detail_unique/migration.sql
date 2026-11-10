/*
  Warnings:

  - You are about to drop the column `max` on the `Experience` table. All the data in the column will be lost.
  - You are about to drop the column `min` on the `Experience` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `JobDetail` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `JobDetail` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Experience" DROP COLUMN "max",
DROP COLUMN "min",
ADD COLUMN     "maxYears" INTEGER,
ADD COLUMN     "minYears" INTEGER;

-- AlterTable
ALTER TABLE "JobDetail" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";
