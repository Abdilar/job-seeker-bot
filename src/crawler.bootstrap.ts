import { JobInJaCreator } from './crawlers'
import { CrawlerExecutionRepository, JobRepository } from './repositories'
import { CrawlerScheduler } from './scheduler'
import { CrawlerExecutionService, JobService } from './services'
import { CrawlJobsTask } from './tasks'

async function bootstrap(): Promise<void> {
  const repository = new JobRepository()
  const jobService = new JobService(repository)

  const providers = [new JobInJaCreator()]

  const executionRepository = new CrawlerExecutionRepository()
  const executionService = new CrawlerExecutionService(executionRepository)
  const crawlJobsTask = new CrawlJobsTask(jobService, providers)

  const scheduler = new CrawlerScheduler(crawlJobsTask, executionService)
  const recoveredCount = await executionService.recoverInterruptedExecutions()
  // eslint-disable-next-line no-console
  console.log(`Recovered ${recoveredCount} interrupted crawler executions`)
  scheduler.start()
  // eslint-disable-next-line no-console
  console.log('Crawler scheduler started successfully!')
}

bootstrap().catch((error: string) => {
  // eslint-disable-next-line no-console
  console.error('Crawler bootstrap failed:', error)

  process.exitCode = 1
})
