import { Locator } from "playwright";
import { ICrawledJob } from "../types";

export interface IBaseJobParser {
  parse(content: Locator): Promise<ICrawledJob>
}