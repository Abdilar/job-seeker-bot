import type { EProvider, ICrawledJob, ICrawledJobDetail, IJob, IJobFilter } from '../../types'

export type SaveJobsResultType = {
  total: number
  saved: number
  failed: number
}

export interface IJobService {
  isValid(data: ICrawledJob): boolean
  save(data: ICrawledJob): Promise<IJob>
  saveAll(data: Array<ICrawledJob>): Promise<SaveJobsResultType>
  saveJobDetail(id: string, data: ICrawledJobDetail): Promise<IJob>
  getJobs(page: number, limit: number, filter?: IJobFilter): Promise<IJob[]>
  getJob(id: string): Promise<IJob | null>
  getLatestJobByProvider(provider: EProvider): Promise<IJob | null>
  count(filter?: IJobFilter): Promise<number>
}
