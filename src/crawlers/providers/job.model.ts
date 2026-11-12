import type { ICrawledJob } from '../../types'

export interface IJobProvider {
  initialize(): Promise<void>
  getJobs(): Promise<ICrawledJob[]>
  getJobsByCount(count: number): Promise<ICrawledJob[]>
}
