import type { IJobLinkChecker } from '../../crawlers/verification'
import type { IJobRepository } from '../../repositories/job'
import { EJobStatus, type IJob } from '../../types'
import type { IJobVerificationService } from './job-verification.model'

const MINUTE_IN_MS = 60 * 1000
const DEFAULT_CACHE_MINUTES = 360

export class JobVerificationService implements IJobVerificationService {
  constructor(
    private readonly repository: IJobRepository,
    private readonly checker: IJobLinkChecker,
    private readonly cacheMinutes = DEFAULT_CACHE_MINUTES,
  ) {}

  async verify(job: IJob): Promise<IJob> {
    if (job.status !== EJobStatus.ACTIVE || !this.checker.supports(job.provider)) {
      return job
    }

    if (this.isFresh(job)) {
      return job
    }

    const check = await this.checker.check(job)

    if (!check.status) {
      await this.repository.touchVerification(job.id, check.checkedAt)

      return { ...job, lastVerifiedAt: check.checkedAt }
    }

    await this.repository.updateVerification(job.id, {
      status: check.status,
      checkedAt: check.checkedAt,
      reason: check.reason,
    })

    return {
      ...job,
      status: check.status,
      lastVerifiedAt: check.checkedAt,
      expiredAt: check.status === EJobStatus.ACTIVE ? undefined : check.checkedAt,
      expiryReason:
        check.status === EJobStatus.EXPIRED || check.status === EJobStatus.CLOSED
          ? check.reason
          : undefined,
      removalReason: check.status === EJobStatus.REMOVED ? check.reason : undefined,
    }
  }

  private isFresh(job: IJob): boolean {
    if (!job.lastVerifiedAt) {
      return false
    }

    return Date.now() - job.lastVerifiedAt.getTime() < this.cacheMinutes * MINUTE_IN_MS
  }
}
