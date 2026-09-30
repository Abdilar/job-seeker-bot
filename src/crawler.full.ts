import type { JobProvider } from './crawlers'
import { JobInJaCreator } from './crawlers'
import { JobRepository } from './repositories'
import { JobService } from './services'
import { CrawlJobsTask } from './tasks'
import type { CrawlerFullArgumentsType } from './types'
import { EProvider } from './types'

async function run() {
  const args: Partial<CrawlerFullArgumentsType>[] = process.argv
    .filter((arg: string) => arg.startsWith('--'))
    .map((item) => {
      const key = item.split('=')[0].replaceAll('--', '')
      const value = item.split('=')[1].toUpperCase()

      return { [key]: key === 'providers' ? value.replaceAll(' ', '').split(',') : value }
    })
  const crawlArgs: CrawlerFullArgumentsType = Object.assign({}, ...args) as CrawlerFullArgumentsType
  const providers: JobProvider[] = []

  const repository = new JobRepository()
  const jobService = new JobService(repository)

  if (crawlArgs?.providers) {
    for (const provider of Object.values(EProvider)) {
      switch (provider) {
        case EProvider.JOB_IN_JA:
          providers.push(new JobInJaCreator(jobService))
          break
        default:
          break
      }
    }
  }

  const crawlJobsTask = new CrawlJobsTask(jobService, providers)
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
  .finally(() => process.exit(0))
