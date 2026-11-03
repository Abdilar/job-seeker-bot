import { ECrawlJobMode } from './constants'
import type { JobProvider } from './crawlers'
import { JobRepository } from './repositories'
import { JobService } from './services'
import type { CrawlerJobArgumentsType } from './types'
import { EProvider } from './types'
import { providerCreator } from './utilities'

async function run() {
  const args: Partial<CrawlerJobArgumentsType>[] = process.argv
    .filter((arg: string) => arg.startsWith('--'))
    .map((item) => {
      const key = item.split('=')[0].replaceAll('--', '')
      const value = item.split('=')[1].toUpperCase()

      return { [key]: value }
    })

  const crawlArgs: CrawlerJobArgumentsType = Object.assign({}, ...args) as CrawlerJobArgumentsType

  const repository = new JobRepository()
  const jobService = new JobService(repository)
  const mode: ECrawlJobMode = crawlArgs.mode ?? ECrawlJobMode.SUMMARY
  const providerName: EProvider = crawlArgs.provider ?? EProvider.JOB_IN_JA

  const provider = providerCreator(providerName, jobService)

  if (!provider) {
    // eslint-disable-next-line no-console
    console.error('The provider is undefined')
    return
  }

  if (mode === ECrawlJobMode.SUMMARY) {
    await crawlSummaryJob(provider)
  } else {
    await crawlDetailJob(provider)
  }
}

async function crawlSummaryJob(provider: JobProvider) {
  try {
    const providerName = provider.constructor.name.replaceAll('Creator', '')
    // eslint-disable-next-line no-console
    console.log(`Start crawling summery ${providerName} job...`)
    const jobs = await provider.crawlJobsByCount(3)
    // eslint-disable-next-line no-console
    console.log(`Finish crawling summery ${providerName} and Show ${jobs.length} jobs`)
    // eslint-disable-next-line no-console
    console.log({ jobs })
  } finally {
    await provider.closeBrowser()
    // eslint-disable-next-line no-console
    console.log('Browser closed...')
  }
}

async function crawlDetailJob(provider: JobProvider) {
  try {
    const providerName = provider.constructor.name.replaceAll('Creator', '')
    // eslint-disable-next-line no-console
    console.log(`Start crawling detail ${providerName} job...`)
    const jobDetail = await provider.crawlJobDetail()
    // eslint-disable-next-line no-console
    console.log(`Finish crawling detail ${providerName}`)
    // eslint-disable-next-line no-console
    console.log({ jobDetail })
  } finally {
    await provider.closeBrowser()
    // eslint-disable-next-line no-console
    console.log('Browser closed...')
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
