import cron from 'node-cron'
import type { ICrawlJobsTask } from '../../tasks'
import type { ICrawlerScheduler } from './crawler.model'
import { randomDelay } from '../../utilities'
import type { CrawlerExecutionService } from '../../services'

export class CrawlerScheduler implements ICrawlerScheduler {
  private isRunning = false

  constructor(
    private readonly crawlJobs: ICrawlJobsTask,
    private readonly executionService: CrawlerExecutionService,
  ) {}

  start(): void {
    const scheduleTime = process.env.JOB_IN_JA_SCHEDULE_TIME || '0 10 * * *'

    cron.schedule(
      scheduleTime,
      async () => {
        try {
          await this.runWithJitter()
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Crawler scheduler failed:', error)
        }
      },
      {
        timezone: 'Asia/Tehran',
      },
    )
  }

  private async runWithJitter(): Promise<void> {
    if (this.isRunning) {
      // eslint-disable-next-line no-console
      console.log('Crawler is already running. Skipping...')
      return
    }

    this.isRunning = true
    let executionId: string | undefined

    try {
      executionId = await this.executionService.start()

      const maxDelaySeconds = 0
      await randomDelay(0, maxDelaySeconds)
      await this.crawlJobs.run()
      await this.executionService.success(executionId)
      // eslint-disable-next-line no-console
      console.log(`Crawler execution completed: ${executionId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? (error.stack ?? error.message) : String(error)
      if (executionId) {
        try {
          await this.executionService.failed(executionId, errorMessage)
        } catch (recordError) {
          // eslint-disable-next-line no-console
          console.error('Failed to record crawler execution:', recordError)
        }
      }
      throw error
    } finally {
      this.isRunning = false
    }
  }
}
