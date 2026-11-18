import { JobInJaCreator, JobVisionCreator } from './crawlers'
import { JobInJaStatusChecker, JobVisionStatusChecker } from './crawlers/status'
import { CrawlerExecutionRepository, JobRepository } from './repositories'
import { CrawlerScheduler, JobStatusScheduler } from './scheduler'
import {
  CrawlerExecutionService,
  JobAdmissionService,
  JobService,
  JobStatusService,
} from './services'
import { CrawlJobsTask, RevalidateJobsTask } from './tasks'
import { EProvider } from './types'

async function bootstrap(): Promise<void> {
  const repository = new JobRepository()
  const jobService = new JobService(repository)

  const providers = [new JobInJaCreator(jobService), new JobVisionCreator(jobService)]
  const statusCheckers = [new JobInJaStatusChecker(), new JobVisionStatusChecker()]
  const admissionService = new JobAdmissionService(repository, statusCheckers, {
    maxChecks: Number(process.env.JOB_ADMISSION_MAX_CHECKS ?? 100),
  })

  const executionRepository = new CrawlerExecutionRepository()
  const executionService = new CrawlerExecutionService(executionRepository)
  const crawlJobsTask = new CrawlJobsTask(jobService, providers, admissionService)

  const jobStatusService = new JobStatusService(repository)
  const revalidateJobsTask = new RevalidateJobsTask(jobStatusService, statusCheckers, {
    providers: [EProvider.JOB_IN_JA, EProvider.JOB_VISION],
    batchSize: Number(process.env.JOB_REVALIDATION_BATCH_SIZE ?? 200),
    staleAfterDays: Number(process.env.JOB_REVALIDATION_AFTER_DAYS ?? 7),
  })

  const scheduler = new CrawlerScheduler(crawlJobsTask, executionService)
  const jobStatusScheduler = new JobStatusScheduler(revalidateJobsTask)
  const recoveredCount = await executionService.recoverInterruptedExecutions()
  // eslint-disable-next-line no-console
  console.log(`Recovered ${recoveredCount} interrupted crawler executions`)
  scheduler.start()
  jobStatusScheduler.start()
  // eslint-disable-next-line no-console
  console.log('Crawler scheduler started successfully!')
}

bootstrap().catch((error: string) => {
  // eslint-disable-next-line no-console
  console.error('Crawler bootstrap failed:', error)

  process.exitCode = 1
})
