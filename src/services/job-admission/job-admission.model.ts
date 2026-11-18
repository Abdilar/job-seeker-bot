import type { ICrawledJob } from '../../types'

export interface JobAdmissionResult {
  accepted: ICrawledJob[]
  rejected: number
  retry: number
}

export interface IJobAdmissionService {
  filterNewJobs(jobs: ICrawledJob[]): Promise<JobAdmissionResult>
}
