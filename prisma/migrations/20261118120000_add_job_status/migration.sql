-- NOTE: Adds the job lifecycle status and the bookkeeping used by revalidation.
CREATE TYPE "EJobStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CLOSED', 'REMOVED');

ALTER TABLE "Job"
  ADD COLUMN "status" "EJobStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "lastSeenAt" TIMESTAMP(3),
  ADD COLUMN "lastCheckedAt" TIMESTAMP(3),
  ADD COLUMN "expiredAt" TIMESTAMP(3),
  ADD COLUMN "expiryReason" TEXT,
  ADD COLUMN "checkFailures" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Job_status_lastCheckedAt_idx" ON "Job"("status", "lastCheckedAt");
CREATE INDEX "Job_provider_status_postedAt_idx" ON "Job"("provider", "status", "postedAt");
