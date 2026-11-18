import type { IJobStatusChecker } from '../../crawlers/status'
import type { IJobStatusService } from '../../services'
import { EJobStatus } from '../../types'
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
      unknown: 0,
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
        const change = await this.jobStatusService.recordResult(
          job,
          check,
          this.options.minFailures,
        )

        result.checked++

        if (change.status === EJobStatus.ACTIVE) result.active++
        if (change.status === EJobStatus.EXPIRED) result.expired++
        if (change.status === EJobStatus.CLOSED) result.closed++
        if (change.status === EJobStatus.REMOVED) result.removed++
        if (change.status === EJobStatus.UNKNOWN) result.unknown++

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
