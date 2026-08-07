import { Locator } from "playwright";
import { IBaseJobParser } from "./job.model";

export class JobParser implements IBaseJobParser {
  constructor(private parser: IBaseJobParser) {}

  async parse(content: Locator) {
    if (!this.parser) {
      throw new Error(`Unsupported content in JobParser!`)
    }

    return await this.parser.parse(content)
  }
}