import type { IJobExpirationService } from '../../services'
import type { ExpireJobsOptions, ExpireJobsResult, IExpireJobsTask } from './expire-jobs.model'

const DAY_IN_MS = 24 * 60 * 60 * 1000

export class ExpireJobsTask implements IExpireJobsTask {
  constructor(
    private readonly jobExpirationService: IJobExpirationService,
    private readonly options: ExpireJobsOptions,
  ) {}

  async run(): Promise<ExpireJobsResult> {
    const cutoff = new Date(Date.now() - this.options.ttlDays * DAY_IN_MS)
    const expired = await this.jobExpirationService.expireOlderThan(cutoff)

    // eslint-disable-next-line no-console
    console.log('Expired stale jobs.', { cutoff: cutoff.toISOString(), expired })

    return { cutoff, expired }
  }
}
