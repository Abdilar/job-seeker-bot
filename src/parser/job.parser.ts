import { Locator } from "playwright";
import { IJobParser, IJobParserStrategy } from "./job.model";

export class JobParser implements IJobParser {
  constructor(private parser: IJobParserStrategy) {}

  setParser(parser: IJobParserStrategy) {
    if (!parser) {
      throw new Error('The parser is invalid!')
    }
    this.parser = parser
  }

  async parse(content: Locator) {
    if (!this.parser) {
      throw new Error(`Unsupported content in JobParser!`)
    }

    return await this.parser.parse(content)
  }
}