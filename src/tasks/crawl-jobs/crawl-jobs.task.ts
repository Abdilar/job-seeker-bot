import type { JobProvider } from '../../crawlers'
import type { IJobService } from '../../services'
import type { ICrawlJobsTask } from './crawl-jobs.model'

export class CrawlJobsTask implements ICrawlJobsTask {
  constructor(
    private readonly jobService: IJobService,
    private readonly providers: JobProvider[],
  ) {}

  async run(): Promise<void> {
    for (const provider of this.providers) {
      try {
        const providerName = provider.constructor.name.replaceAll('Creator', '')
        // eslint-disable-next-line no-console
        console.log(`Start crawling ${providerName} jobs...`)
        const jobs = await provider.crawlJobs()
        // eslint-disable-next-line no-console
        console.log(`Finish crawling ${providerName} and Start saving ${jobs.length} jobs`)
        await this.jobService.saveAll(jobs)
        // eslint-disable-next-line no-console
        console.log(`All ${providerName} jobs saved successfully`)
      } finally {
        await provider.closeBrowser()
        // eslint-disable-next-line no-console
        console.log('Browser closed...')
      }
    }
  }
}
