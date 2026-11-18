import type { JobProvider } from '../../crawlers'
import type { IJobAdmissionService, IJobService } from '../../services'
import type { ICrawlJobsTask } from './crawl-jobs.model'

export class CrawlJobsTask implements ICrawlJobsTask {
  constructor(
    private readonly jobService: IJobService,
    private readonly providers: JobProvider[],
    private readonly admissionService?: IJobAdmissionService,
  ) {}

  async run(): Promise<void> {
    for (const provider of this.providers) {
      try {
        const providerName = provider.constructor.name.replaceAll('Creator', '')
        // eslint-disable-next-line no-console
        console.log(`Start crawling ${providerName} jobs...`)
        const jobs = await provider.crawlJobs()
        const admitted = this.admissionService
          ? await this.admissionService.filterNewJobs(jobs)
          : { accepted: jobs, rejected: 0 }

        if (admitted.rejected) {
          // eslint-disable-next-line no-console
          console.log(`Skipped ${admitted.rejected} inactive ${providerName} jobs before saving`)
        }

        // eslint-disable-next-line no-console
        console.log(
          `Finish crawling ${providerName} and Start saving ${admitted.accepted.length} jobs`,
        )
        await this.jobService.saveAll(admitted.accepted)
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
