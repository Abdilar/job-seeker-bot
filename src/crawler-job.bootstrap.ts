import { ECrawlJobMode } from './constants'
import { JobRepository } from './repositories'
import { JobService } from './services'
import type { EProvider, CrawlerJobArgumentsType } from './types'
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
  const jobMode: ECrawlJobMode = crawlArgs.mode ?? ECrawlJobMode.SUMMARY
  // eslint-disable-next-line no-console
  console.log({ jobMode, crawlArgs })
  if (jobMode === ECrawlJobMode.SUMMARY) {
    await crawlSummaryJob(jobService, crawlArgs.provider)
  } else {
    await crawlDetailJob(jobService, crawlArgs.provider)
  }
}

async function crawlSummaryJob(service: JobService, eProvider?: EProvider) {
  const provider = providerCreator(service, eProvider, ECrawlJobMode.SUMMARY)

  try {
    const providerName = provider.constructor.name.replaceAll('Creator', '')
    // eslint-disable-next-line no-console
    console.log(`Start crawling summary ${providerName} job...`)
    const jobs = await provider.crawlJobsByCount(3)
    // eslint-disable-next-line no-console
    console.log(`Finish crawling summary ${providerName} and Show ${jobs.length} jobs`)
    if (jobs.length) {
      await service.saveAll(jobs)
      // eslint-disable-next-line no-console
      console.log(`All ${providerName} jobs saved successfully`)
    }
    // eslint-disable-next-line no-console
    console.log({ jobs })
  } finally {
    await provider.closeBrowser()
    // eslint-disable-next-line no-console
    console.log('Browser closed...')
  }
}

async function crawlDetailJob(service: JobService, eProvider?: EProvider) {
  const provider = providerCreator(service, eProvider, ECrawlJobMode.DETAIL)

  try {
    const providerName = provider.constructor.name.replaceAll('Creator', '')
    // eslint-disable-next-line no-console
    console.log(`Start crawling detail ${providerName} job...`)
    const jobDetail = await provider.crawlJobDetail()
    // eslint-disable-next-line no-console
    console.log(`Finish crawling detail ${providerName}`)
    // eslint-disable-next-line no-console
    console.log({ jobDetail: jobDetail.length })
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
    // process.exit(1)
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Crawler failed:', error)
    process.exitCode = 1
  })
