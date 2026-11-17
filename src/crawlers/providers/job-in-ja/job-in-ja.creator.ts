import type { Page } from 'playwright'
import type { IJobProvider } from '../job.model'
import { JobProvider } from '../job.provider'
import { JobInJaProduct } from './job-in-ja.product'
import { JobInJaParser, JobParser } from '../../parsers'
import type { IJobService } from '../../../services'
import { ECrawlJobMode, ECrawlMode } from '../../../constants'

export class JobInJaCreator extends JobProvider {
  constructor(
    private readonly service: IJobService,
    protected readonly jobMode: ECrawlJobMode = ECrawlJobMode.SUMMARY,
    protected readonly crawlMode: ECrawlMode = ECrawlMode.INCREMENTAL,
  ) {
    super()
  }

  protected async createProvider(page: Page): Promise<IJobProvider> {
    const jobInJaParser = new JobInJaParser(page)
    const jobParser = new JobParser(jobInJaParser)
    const provider = new JobInJaProduct(page, jobParser, this.service, this.crawlMode)
    if (this.jobMode === ECrawlJobMode.SUMMARY) {
      await provider.initializeSummery()
    }
    // eslint-disable-next-line no-console
    console.log('jobinja: createProvider(page)')
    return provider
  }
}
