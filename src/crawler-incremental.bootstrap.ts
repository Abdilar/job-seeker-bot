import { JobInJaCreator, JobVisionCreator } from './crawlers'
import { CrawlerExecutionRepository, JobRepository } from './repositories'
import { CrawlerScheduler, JobExpirationScheduler } from './scheduler'
import { CrawlerExecutionService, JobExpirationService, JobService } from './services'
import { CrawlJobsTask, ExpireJobsTask } from './tasks'

async function bootstrap(): Promise<void> {
  const repository = new JobRepository()
  const jobService = new JobService(repository)

  const providers = [new JobInJaCreator(jobService), new JobVisionCreator(jobService)]

  const executionRepository = new CrawlerExecutionRepository()
  const executionService = new CrawlerExecutionService(executionRepository)
  const crawlJobsTask = new CrawlJobsTask(jobService, providers)

  const jobExpirationService = new JobExpirationService(repository)
  const expireJobsTask = new ExpireJobsTask(jobExpirationService, {
    ttlDays: Number(process.env.JOB_TTL_DAYS ?? 30),
  })

  const scheduler = new CrawlerScheduler(crawlJobsTask, executionService)
  const jobExpirationScheduler = new JobExpirationScheduler(expireJobsTask)
  const recoveredCount = await executionService.recoverInterruptedExecutions()
  // eslint-disable-next-line no-console
  console.log(`Recovered ${recoveredCount} interrupted crawler executions`)
  scheduler.start()
  jobExpirationScheduler.start()
  // eslint-disable-next-line no-console
  console.log('Crawler scheduler started successfully!')
}

bootstrap().catch((error: string) => {
  // eslint-disable-next-line no-console
  console.error('Crawler bootstrap failed:', error)

  process.exitCode = 1
})
