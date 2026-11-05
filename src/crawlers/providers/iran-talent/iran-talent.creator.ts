import type { Page } from 'playwright'
import type { IJobProvider } from '../job.model'
import { JobProvider } from '../job.provider'
import { IranTalentProduct } from './iran-talent.product'
import { IranTalentParser, JobParser } from '../../parsers'
import type { IJobService } from '../../../services'
import { ECrawlMode } from '../../../constants'

export class IranTalentCreator extends JobProvider {
  constructor(
    private readonly service: IJobService,
    protected readonly mode: ECrawlMode = ECrawlMode.INCREMENTAL,
  ) {
    super()
  }

  protected async createProvider(page: Page): Promise<IJobProvider> {
    // NOTE: `JobParser` needs a strategy at construction; the product replaces this one with a page's search state before it parses any card.
    const jobParser = new JobParser(new IranTalentParser())
    const provider = new IranTalentProduct(page, jobParser, this.service, this.mode)
    await provider.initialize()
    return provider
  }
}
