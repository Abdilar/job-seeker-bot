import { Locator } from "playwright";
import { EProvider, ICrawledJob } from "../types";

export interface IJobParser {
  create(type: EProvider): IBaseJobParser | undefined
}

export interface IBaseJobParser {
  parse(content: Locator): Promise<ICrawledJob>
}