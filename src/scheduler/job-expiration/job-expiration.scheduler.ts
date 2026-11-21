import cron from 'node-cron'
import { JOB_POSTING_TIMEZONE } from '../../crawlers/constants'
import type { IExpireJobsTask } from '../../tasks'

export class JobExpirationScheduler {
  private isRunning = false

  constructor(
    private readonly expireJobs: IExpireJobsTask,
    private readonly scheduleTime = process.env.JOB_EXPIRATION_SCHEDULE_TIME ?? '0 3 * * *',
  ) {}

  start(): void {
    cron.schedule(
      this.scheduleTime,
      async () => {
        if (this.isRunning) {
          // eslint-disable-next-line no-console
          console.log('Job expiration is already running. Skipping...')

          return
        }

        this.isRunning = true

        try {
          await this.expireJobs.run()
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Job expiration failed:', error)
        } finally {
          this.isRunning = false
        }
      },
      {
        timezone: JOB_POSTING_TIMEZONE,
      },
    )

    // eslint-disable-next-line no-console
    console.log(`Job expiration scheduler started with "${this.scheduleTime}".`)
  }
}
