import { JobInJaCreator } from './crawlers'
import { JobRepository } from './repositories'
import { JobService } from './services'
import { CrawlJobsTask } from './tasks'

const repository = new JobRepository()
const jobService = new JobService(repository)

const providers = [new JobInJaCreator()]

const crawlJobsTask = new CrawlJobsTask(jobService, providers)

async function run() {
  console.log('Crawler started manually')
  await crawlJobsTask.run()
}

run()
  .then(() => {
    console.log('Crawler finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Crawler failed:', error)
    process.exit(1)
  })
