import type { EJobStatus, IJob, IJobStatusCheck } from '../../types'

export interface IJobStatusChange {
  status: EJobStatus
  checkFailures: number
}

export interface IJobStatusService {
  findCandidates(providers: IJob['provider'][], staleBefore: Date, limit: number): Promise<IJob[]>
  recordResult(job: IJob, check: IJobStatusCheck): Promise<IJobStatusChange>
}
