import type { Locator } from 'playwright'
import type { ICrawledJob, ICrawledJobDetail, IJob } from '../../types'

export interface IJobParserStrategy {
  parseSummary(content: Locator): Promise<ICrawledJob | undefined>
  parseDetail(job: IJob): Promise<ICrawledJobDetail | undefined>
}

export interface IJobParser extends IJobParserStrategy {
  setParser(parser: IJobParserStrategy): void
}
