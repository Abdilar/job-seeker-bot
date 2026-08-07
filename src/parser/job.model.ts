import { Locator } from "playwright";
import { ICrawledJob } from "../types";

export interface IJobParserStrategy {
  parse(content: Locator): Promise<ICrawledJob>
}

export interface IJobParser extends IJobParserStrategy {
  setParser(parser: IJobParserStrategy): void
}