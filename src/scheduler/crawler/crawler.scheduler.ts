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
    cron.schedule(
      '0 10 * * *',
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
      const maxDelaySeconds = 0
      await randomDelay(0, maxDelaySeconds)
      executionId = await this.executionService.start()
      // eslint-disable-next-line no-console
      console.log('Crawler started...')
      await this.crawlJobs.run()
      await this.executionService.success(executionId)
      // eslint-disable-next-line no-console
      console.log('Crawler completed successfully!')
    } catch (error) {
      if (executionId) {
        try {
          await this.executionService.failed(executionId, error as string)
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
