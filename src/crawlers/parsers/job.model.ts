import type { Locator } from 'playwright'
import type { ICrawledJob, ICrawledJobDetail } from '../../types'

export interface IJobParserStrategy {
  parseSummary(content: Locator): Promise<ICrawledJob | undefined>
  parseDetail(content: Locator, url: string): Promise<ICrawledJobDetail | undefined>
}

export interface IJobParser extends IJobParserStrategy {
  setParser(parser: IJobParserStrategy): void
}
