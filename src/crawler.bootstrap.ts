import { JobInJaCreator } from './crawlers'
import { CrawlerExecutionRepository, JobRepository } from './repositories'
import { CrawlerScheduler } from './scheduler'
import { CrawlerExecutionService, JobService } from './services'
import { CrawlJobsTask } from './tasks'

const repository = new JobRepository()
const jobService = new JobService(repository)

const providers = [new JobInJaCreator()]

const crawlJobsTask = new CrawlJobsTask(jobService, providers)

const executionRepository = new CrawlerExecutionRepository()
const executionService = new CrawlerExecutionService(executionRepository)

const scheduler = new CrawlerScheduler(crawlJobsTask, executionService)

scheduler.start()
