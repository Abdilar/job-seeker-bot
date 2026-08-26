// import { Page } from "playwright";
// import { ICrawledJob } from "../types";

import { Page } from "playwright";
import { JobInJaProvider } from "./job-in-ja/job-in-ja.provider";

// export type InitializeReturnType = {
//   page: Page
// }
// export interface IJobProvider {
//   initialize(): Promise<InitializeReturnType>
  // getJobs(): Promise<ICrawledJob[]>
// }

export interface IJobProvider {
  saveJobs: () => Promise<Page>
  closeBrowser: () => Promise<void>
}