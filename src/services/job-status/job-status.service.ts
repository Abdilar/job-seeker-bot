import type { IJobRepository } from '../../repositories/job'
import {
  EJobStatus,
  EJobStatusCheckOutcome,
  type IJob,
  type IJobStatusCheck,
  type EProvider,
} from '../../types'
import type { IJobStatusChange, IJobStatusService } from './job-status.model'

export class JobStatusService implements IJobStatusService {
  constructor(private readonly repository: IJobRepository) {}

  findCandidates(providers: EProvider[], staleBefore: Date, limit: number): Promise<IJob[]> {
    return this.repository.findForRevalidation({ providers, staleBefore, limit })
  }

  async recordResult(job: IJob, check: IJobStatusCheck): Promise<IJobStatusChange> {
    let status = job.status
    let checkFailures = job.checkFailures
    let expiredAt: Date | null = null
    let reason: string | undefined = check.reason

    if (check.outcome === EJobStatusCheckOutcome.ACTIVE) {
      status = EJobStatus.ACTIVE
      checkFailures = 0
      reason = undefined
    }

    if (check.outcome === EJobStatusCheckOutcome.RETRY) {
      status = job.status
      checkFailures = job.checkFailures + 1
      reason = undefined
    }

    if (
      check.outcome === EJobStatusCheckOutcome.EXPIRED ||
      check.outcome === EJobStatusCheckOutcome.CLOSED ||
      check.outcome === EJobStatusCheckOutcome.REMOVED
    ) {
      status =
        check.outcome === EJobStatusCheckOutcome.EXPIRED
          ? EJobStatus.EXPIRED
          : check.outcome === EJobStatusCheckOutcome.CLOSED
            ? EJobStatus.CLOSED
            : EJobStatus.REMOVED
      checkFailures = 0
      expiredAt = check.checkedAt
    }

    await this.repository.updateStatus(job.id, {
      status,
      reason,
      checkedAt: check.checkedAt,
      checkFailures,
      expiredAt,
    })

    return { status, checkFailures }
  }
}
