import type { ICrawledJob, IJob } from '../../types'

export interface IJobProvider {
  initializeSummery(): Promise<void>
  getJobs(): Promise<ICrawledJob[]>
  getJobsByCount(count: number): Promise<ICrawledJob[]>
  getJobsWithoutDetail(): Promise<IJob[]>
}
