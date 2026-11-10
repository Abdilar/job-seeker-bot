/*
  Warnings:

  - A unique constraint covering the columns `[applicationUrl]` on the table `JobDetail` will be added. If there are existing duplicate values, this will fail.
  - Made the column `applicationUrl` on table `JobDetail` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "JobDetail" ALTER COLUMN "applicationUrl" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "JobDetail_applicationUrl_key" ON "JobDetail"("applicationUrl");
