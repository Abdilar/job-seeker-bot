import type { Locator } from 'playwright'
import type { ICrawledJob, ICrawledJobDetails } from '../../types'

export interface IJobParserStrategy {
  parseSummary(content: Locator): Promise<ICrawledJob | undefined>
  parseDetail(content: Locator): Promise<ICrawledJobDetails | undefined>
}

export interface IJobParser extends IJobParserStrategy {
  setParser(parser: IJobParserStrategy): void
}
