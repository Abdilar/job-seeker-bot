import type { Locator } from 'playwright'
import type { IJobParser, IJobParserStrategy } from './job.model'
import type { ICrawledJobDetail, IJob } from '../../types'

export class JobParser implements IJobParser {
  constructor(private parser: IJobParserStrategy) {}

  setParser(parser: IJobParserStrategy) {
    if (!parser) {
      throw new Error('The parser is invalid!')
    }
    this.parser = parser
  }

  async parseSummary(content: Locator) {
    if (!this.parser) {
      throw new Error(`Unsupported content in JobParser!`)
    }

    return await this.parser.parseSummary(content)
  }

  async parseDetail(job: IJob): Promise<ICrawledJobDetail | undefined> {
    // eslint-disable-next-line no-console
    console.log(`job parser: parseDetail(job: IJob) -> jobTitle: ${job.title}`)
    if (!this.parser) {
      throw new Error(`Unsupported content in JobParser!`)
    }

    return await this.parser.parseDetail(job)
  }
}
