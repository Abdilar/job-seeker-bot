import { Page } from "playwright";
// import { ICrawledJob } from "../types";

export type InitializeReturnType = {
  page: Page
}
export interface IJobProvider {
  initialize(): Promise<InitializeReturnType>
  // getJobs(): Promise<ICrawledJob[]>
}
