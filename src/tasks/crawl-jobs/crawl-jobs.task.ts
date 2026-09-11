import { JobProvider } from '../../crawlers'
import { IJobService } from '../../services'
import { ICrawlJobsTask } from './crawl-jobs.model'

export class CrawlJobsTask implements ICrawlJobsTask {
  constructor(
    private readonly jobService: IJobService,
    private readonly providers: JobProvider[],
  ) {}

  async run(): Promise<void> {
    for (const provider of this.providers) {
      const jobs = await provider.crawlJobs()
      this.jobService.saveAll(jobs)
      provider.closeBrowser()
    }
  }
}
