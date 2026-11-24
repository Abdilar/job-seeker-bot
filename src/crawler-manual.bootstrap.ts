import { ECrawlJobMode, ECrawlMode } from './constants'
import type { JobProvider } from './crawlers'
import { JobRepository } from './repositories'
import { JobService } from './services'
import { CrawlJobsTask } from './tasks'
import type { CrawlerFullArgumentsType } from './types'
import { EProvider } from './types'
import { providerCreator } from './utilities'

async function run() {
  const args: Partial<CrawlerFullArgumentsType>[] = process.argv
    .filter((arg: string) => arg.startsWith('--'))
    .map((item) => {
      const key = item
        .split('=')[0]
        .replaceAll('--', '')
        .split('-')
        .map((i, index) => {
          if (index !== 0) {
            return i[0].toUpperCase() + i.split('').splice(1).join('')
          }
          return i
        })
        .join('')
      const value = item.split('=')[1].toUpperCase()

      return { [key]: key === 'providers' ? value.replaceAll(' ', '').split(',') : value }
    })
  const crawlArgs: CrawlerFullArgumentsType = Object.assign({}, ...args) as CrawlerFullArgumentsType
  const providers: JobProvider[] = []
  const repository = new JobRepository()
  const jobService = new JobService(repository)
  const crawlMode: ECrawlMode = crawlArgs.crawlMode ?? ECrawlMode.INCREMENTAL
  const jobMode: ECrawlJobMode = crawlArgs.jobMode ?? ECrawlJobMode.SUMMARY

  if (crawlArgs?.providers) {
    for (const provider of Object.values(EProvider)) {
      providers.push(providerCreator(jobService, provider, jobMode, crawlMode))
    }
  }

  const crawlJobsTask = new CrawlJobsTask(jobService, providers)
  if (jobMode === ECrawlJobMode.SUMMARY) {
    await crawlJobsTask.runSummary()
  } else {
    await crawlJobsTask.runDetail()
  }
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
  .finally(() => process.exit(0))
