/*
  Warnings:

  - You are about to drop the column `jobDetailId` on the `Experience` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[detailId]` on the table `Experience` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `detailId` to the `Experience` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Experience" DROP CONSTRAINT "Experience_jobDetailId_fkey";

-- DropIndex
DROP INDEX "Experience_jobDetailId_key";

-- AlterTable
ALTER TABLE "Experience" DROP COLUMN "jobDetailId",
ADD COLUMN     "detailId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Experience_detailId_key" ON "Experience"("detailId");

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "JobDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
