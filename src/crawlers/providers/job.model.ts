import type { ICrawledJob } from '../../types'

export interface IJobProvider {
  getJobs(): Promise<ICrawledJob[]>
  getJobsByCount(count: number): Promise<ICrawledJob[]>
  initialize(): Promise<void>
}
