import type { Page } from 'playwright'
import type { IJobProvider } from '../job.model'
import { JobProvider } from '../job.provider'
import { JobVisionProduct } from './job-vision.product'
import { JobParser, JobVisionParser } from '../../parsers'
import type { IJobService } from '../../../services'
import { ECrawlMode } from '../../../constants'

export class JobVisionCreator extends JobProvider {
  constructor(
    private readonly service: IJobService,
    protected readonly mode: ECrawlMode = ECrawlMode.INCREMENTAL,
  ) {
    super()
  }

  protected async createProvider(page: Page): Promise<IJobProvider> {
    const jobVisionParser = new JobVisionParser()
    const jobParser = new JobParser(jobVisionParser)
    const provider = new JobVisionProduct(page, jobParser, this.service, this.mode)
    await provider.initialize()
    return provider
  }
}
