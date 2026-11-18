import type { IJobStatusChecker } from '../../crawlers/status'
import type { IJobRepository } from '../../repositories/job'
import { EJobStatusCheckOutcome, type ICrawledJob } from '../../types'
import type { IJobAdmissionService, JobAdmissionResult } from './job-admission.model'

export interface JobAdmissionOptions {
  maxChecks: number
}

const REJECTED_OUTCOMES = new Set([
  EJobStatusCheckOutcome.EXPIRED,
  EJobStatusCheckOutcome.CLOSED,
  EJobStatusCheckOutcome.REMOVED,
])

export class JobAdmissionService implements IJobAdmissionService {
  constructor(
    private readonly repository: IJobRepository,
    private readonly checkers: IJobStatusChecker[],
    private readonly options: JobAdmissionOptions,
  ) {}

  async filterNewJobs(jobs: ICrawledJob[]): Promise<JobAdmissionResult> {
    const existingUrls = await this.repository.findExistingUrls(jobs.map((job) => job.url))
    const accepted: ICrawledJob[] = []
    let rejected = 0
    let retry = 0
    let checked = 0

    for (const job of jobs) {
      if (existingUrls.has(job.url)) {
        accepted.push(job)
        continue
      }

      const checker = this.checkers.find((candidate) => candidate.supports(job.provider))

      if (!checker || checked >= this.options.maxChecks) {
        accepted.push(job)
        continue
      }

      checked++

      try {
        const check = await checker.check(job)

        if (REJECTED_OUTCOMES.has(check.outcome)) {
          rejected++
          // eslint-disable-next-line no-console
          console.info('Skipping an inactive job before saving:', {
            url: job.url,
            outcome: check.outcome,
            reason: check.reason,
          })
          continue
        }

        if (check.outcome === EJobStatusCheckOutcome.RETRY) {
          retry++
          // eslint-disable-next-line no-console
          console.info('Postponing an unverified job before saving:', {
            url: job.url,
            reason: check.reason,
          })
          continue
        }

        accepted.push(job)
      } catch (error) {
        // NOTE: A failed admission check must not store an unverified job as active.
        retry++
        // eslint-disable-next-line no-console
        console.error('Job admission check failed:', { url: job.url, error })
      }
    }

    return { accepted, rejected, retry }
  }
}
