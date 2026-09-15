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
      const jobs = await provider.crawlJobs()
      await this.jobService.saveAll(jobs)
      await provider.closeBrowser()
      // eslint-disable-next-line no-console
      console.log('Browser closed...')
    }
  }
}
