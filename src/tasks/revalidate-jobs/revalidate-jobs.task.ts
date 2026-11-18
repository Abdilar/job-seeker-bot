import type { IJobStatusChecker } from '../../crawlers/status'
import type { IJobStatusService } from '../../services'
import { EJobStatusCheckOutcome } from '../../types'
import { randomDelay } from '../../utilities'
import type {
  IRevalidateJobsTask,
  RevalidateJobsOptions,
  RevalidateJobsResult,
} from './revalidate-jobs.model'

const DAY_IN_MS = 24 * 60 * 60 * 1000

export class RevalidateJobsTask implements IRevalidateJobsTask {
  constructor(
    private readonly jobStatusService: IJobStatusService,
    private readonly checkers: IJobStatusChecker[],
    private readonly options: RevalidateJobsOptions,
  ) {}

  async run(): Promise<RevalidateJobsResult> {
    const result: RevalidateJobsResult = {
      checked: 0,
      active: 0,
      expired: 0,
      closed: 0,
      removed: 0,
      retry: 0,
      errors: 0,
    }

    const supportedProviders = this.options.providers.filter((provider) =>
      this.checkers.some((checker) => checker.supports(provider)),
    )

    if (!supportedProviders.length) {
      return result
    }

    const staleBefore = new Date(Date.now() - this.options.staleAfterDays * DAY_IN_MS)
    const jobs = await this.jobStatusService.findCandidates(
      supportedProviders,
      staleBefore,
      this.options.batchSize,
    )

    // eslint-disable-next-line no-console
    console.log(`Revalidating ${jobs.length} jobs...`, {
      providers: supportedProviders,
      staleBefore: staleBefore.toISOString(),
    })

    for (const job of jobs) {
      const checker = this.checkers.find((candidate) => candidate.supports(job.provider))

      if (!checker) {
        continue
      }

      try {
        const check = await checker.check(job)
        await this.jobStatusService.recordResult(job, check)

        result.checked++

        if (check.outcome === EJobStatusCheckOutcome.ACTIVE) result.active++
        if (check.outcome === EJobStatusCheckOutcome.EXPIRED) result.expired++
        if (check.outcome === EJobStatusCheckOutcome.CLOSED) result.closed++
        if (check.outcome === EJobStatusCheckOutcome.REMOVED) result.removed++
        if (check.outcome === EJobStatusCheckOutcome.RETRY) result.retry++

        await randomDelay(300, 800)
      } catch (error) {
        result.errors++
        // eslint-disable-next-line no-console
        console.error('Failed to revalidate job:', { id: job.id, url: job.url, error })
      }
    }

    // eslint-disable-next-line no-console
    console.log('Job revalidation finished.', result)

    return result
  }
}
