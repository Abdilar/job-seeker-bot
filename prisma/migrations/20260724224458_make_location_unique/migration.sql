/*
  Warnings:

  - You are about to drop the column `city` on the `Location` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[country,province]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - Made the column `province` on table `Location` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Location" DROP COLUMN "city",
ALTER COLUMN "province" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Location_country_province_key" ON "Location"("country", "province");
