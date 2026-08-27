import { ICrawledJob } from "../types";

export interface IJobProvider {
  getJobs(): Promise<ICrawledJob[]>
  initialize(): Promise<void>
}