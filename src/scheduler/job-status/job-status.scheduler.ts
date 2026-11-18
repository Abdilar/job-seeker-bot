import cron from 'node-cron'
import { JOB_POSTING_TIMEZONE } from '../../crawlers/constants'
import type { IRevalidateJobsTask } from '../../tasks'

export class JobStatusScheduler {
  private isRunning = false

  constructor(
    private readonly revalidateJobs: IRevalidateJobsTask,
    private readonly scheduleTime = process.env.JOB_REVALIDATION_SCHEDULE_TIME ?? '0 */6 * * *',
  ) {}

  start(): void {
    cron.schedule(
      this.scheduleTime,
      async () => {
        if (this.isRunning) {
          // eslint-disable-next-line no-console
          console.log('Job revalidation is already running. Skipping...')

          return
        }

        this.isRunning = true

        try {
          await this.revalidateJobs.run()
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Job revalidation failed:', error)
        } finally {
          this.isRunning = false
        }
      },
      {
        timezone: JOB_POSTING_TIMEZONE,
      },
    )

    // eslint-disable-next-line no-console
    console.log(`Job status scheduler started with "${this.scheduleTime}".`)
  }
}
