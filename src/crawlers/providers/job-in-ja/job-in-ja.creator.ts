import type { Page } from 'playwright'
import type { IJobProvider } from '../job.model'
import { JobProvider } from '../job.provider'
import { JobInJaProduct } from './job-in-ja.product'
import { JobInJaParser, JobParser } from '../../parsers'
import type { IJobService } from '../../../services'

export class JobInJaCreator extends JobProvider {
  constructor(private readonly service: IJobService) {
    super()
  }

  protected async createProvider(page: Page): Promise<IJobProvider> {
    const jobInJaParser = new JobInJaParser()
    const jobParser = new JobParser(jobInJaParser)
    const provider = new JobInJaProduct(page, jobParser, this.service)
    await provider.initialize()
    return provider
  }
}
