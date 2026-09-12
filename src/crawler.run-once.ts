import { JobInJaCreator } from './crawlers'
import { JobRepository } from './repositories'
import { JobService } from './services'
import { CrawlJobsTask } from './tasks'

const repository = new JobRepository()
const jobService = new JobService(repository)

const providers = [new JobInJaCreator()]

const crawlJobsTask = new CrawlJobsTask(jobService, providers)

async function run() {
  // eslint-disable-next-line no-console
  console.log('Crawler started manually')
  await crawlJobsTask.run()
}

run()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Crawler finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Crawler failed:', error)
    process.exit(1)
  })
