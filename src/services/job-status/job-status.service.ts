import type { IJobRepository } from '../../repositories/job'
import { EJobStatus, type IJob, type IJobStatusCheck, type EProvider } from '../../types'
import type { IJobStatusChange, IJobStatusService } from './job-status.model'

export class JobStatusService implements IJobStatusService {
  constructor(private readonly repository: IJobRepository) {}

  findCandidates(providers: EProvider[], staleBefore: Date, limit: number): Promise<IJob[]> {
    return this.repository.findForRevalidation({ providers, staleBefore, limit })
  }

  async recordResult(
    job: IJob,
    check: IJobStatusCheck,
    minFailures: number,
  ): Promise<IJobStatusChange> {
    let status = check.status
    let checkFailures = check.status === EJobStatus.ACTIVE ? 0 : job.checkFailures + 1
    let unknownSince: Date | null = null
    let expiredAt: Date | null = null
    let reason: string | undefined = check.reason

    if (check.status === EJobStatus.UNKNOWN) {
      if (checkFailures < minFailures) {
        status = EJobStatus.ACTIVE
        reason = undefined
      } else {
        status = EJobStatus.UNKNOWN
        unknownSince = job.unknownSince ?? check.checkedAt
      }
    }

    if (check.status === EJobStatus.ACTIVE) {
      checkFailures = 0
      unknownSince = null
      expiredAt = null
      reason = undefined
    }

    if (
      status === EJobStatus.EXPIRED ||
      status === EJobStatus.CLOSED ||
      status === EJobStatus.REMOVED
    ) {
      checkFailures = 0
      unknownSince = null
      expiredAt = check.checkedAt
    }

    await this.repository.updateStatus(job.id, {
      status,
      reason,
      checkedAt: check.checkedAt,
      checkFailures,
      unknownSince,
      expiredAt,
    })

    return { status, checkFailures }
  }
}
