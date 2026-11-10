/*
  Warnings:

  - You are about to drop the column `salary` on the `Job` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EWorkMode" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "EVisaSponsorship" AS ENUM ('AVAILABLE', 'NOT_AVAILABLE');

-- CreateEnum
CREATE TYPE "EEducationLevel" AS ENUM ('HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'PHD');

-- CreateEnum
CREATE TYPE "EGender" AS ENUM ('MAN', 'WOMAN');

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "salary";

-- CreateTable
CREATE TABLE "JobDetail" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "salary" TEXT,
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredQualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gender" "EGender",
    "education" "EEducationLevel",
    "workMode" "EWorkMode",
    "visaSponsorship" "EVisaSponsorship",
    "applicationUrl" TEXT,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "raw" TEXT,
    "min" INTEGER,
    "max" INTEGER,
    "jobDetailId" TEXT NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobDetail_jobId_key" ON "JobDetail"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Experience_jobDetailId_key" ON "Experience"("jobDetailId");

-- AddForeignKey
ALTER TABLE "JobDetail" ADD CONSTRAINT "JobDetail_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_jobDetailId_fkey" FOREIGN KEY ("jobDetailId") REFERENCES "JobDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
