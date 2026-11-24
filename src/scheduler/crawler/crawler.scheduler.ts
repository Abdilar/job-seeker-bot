import cron from 'node-cron'
import type { ICrawlJobsTask } from '../../tasks'
import type { ICrawlerScheduler } from './crawler.model'
import { randomDelay } from '../../utilities'
import type { ICrawlerExecutionService } from '../../services'
import { ECrawlJobMode, TEHRAN_TIMEZONE } from '../../constants'

export class CrawlerScheduler implements ICrawlerScheduler {
  private readonly runningTasks = new Set<ECrawlJobMode>()

  constructor(
    private readonly crawlJobs: ICrawlJobsTask,
    private readonly executionService: ICrawlerExecutionService,
  ) {}

  start(): void {
    const summarySchedule = process.env.JOB_SUMMARY_SCHEDULE_TIME || '0 10 * * *'
    const detailSchedule = process.env.JOB_DETAIL_SCHEDULE_TIME || '0 14 * * *'

    this.schedule(ECrawlJobMode.SUMMARY, summarySchedule, () => this.crawlJobs.runSummary())
    this.schedule(ECrawlJobMode.DETAIL, detailSchedule, () => this.crawlJobs.runDetail())
  }

  private schedule(name: ECrawlJobMode, scheduleTime: string, task: () => Promise<void>) {
    cron.schedule(
      scheduleTime,
      async () => {
        try {
          await this.runWithJitter(name, task)
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Crawler scheduler [${name}] failed:`, error)
        }
      },
      {
        timezone: TEHRAN_TIMEZONE,
      },
    )
  }

  private async runWithJitter(name: ECrawlJobMode, task: () => Promise<void>): Promise<void> {
    if (this.runningTasks.has(name)) {
      // eslint-disable-next-line no-console
      console.log(`Crawler [${name}] is already running. Skipping...`)
      return
    }

    this.runningTasks.add(name)
    let executionId: string | undefined

    try {
      executionId = await this.executionService.start()

      const maxDelaySeconds = 0
      await randomDelay(0, maxDelaySeconds)
      await task()
      await this.executionService.success(executionId)
      // eslint-disable-next-line no-console
      console.log(`Crawler [${name}] completed: ${executionId}`)
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
      this.runningTasks.delete(name)
    }
  }
}
