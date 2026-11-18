import type { ICrawledJob } from '../../types'

export interface JobAdmissionResult {
  accepted: ICrawledJob[]
  rejected: number
}

export interface IJobAdmissionService {
  filterNewJobs(jobs: ICrawledJob[]): Promise<JobAdmissionResult>
}
