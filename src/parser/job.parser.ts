import { Locator } from "playwright";
import { IJobParserStrategy } from "./job.model";

export class JobParser implements IJobParserStrategy {
  constructor(private parser: IJobParserStrategy) {}

  async parse(content: Locator) {
    if (!this.parser) {
      throw new Error(`Unsupported content in JobParser!`)
    }

    return await this.parser.parse(content)
  }
}