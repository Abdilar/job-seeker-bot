-- CreateEnum
CREATE TYPE "ECrawlerStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- AlterEnum
ALTER TYPE "EProvider" ADD VALUE 'E_ESTEKHDAM';

-- CreateTable
CREATE TABLE "CrawlerExecution" (
    "id" TEXT NOT NULL,
    "status" "ECrawlerStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlerExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrawlerExecution_startedAt_idx" ON "CrawlerExecution"("startedAt");

-- CreateIndex
CREATE INDEX "CrawlerExecution_status_startedAt_idx" ON "CrawlerExecution"("status", "startedAt");
