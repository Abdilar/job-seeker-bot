/*
  Warnings:

  - A unique constraint covering the columns `[fullName]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Company_fullName_key" ON "Company"("fullName");
