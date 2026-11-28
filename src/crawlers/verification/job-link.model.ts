import type { EJobStatus, EProvider, IJob } from '../../types'

export interface IJobLinkCheck {
  status?: EJobStatus
  reason: string
  checkedAt: Date
}

export interface IJobLinkChecker {
  supports(provider: EProvider): boolean
  check(job: Pick<IJob, 'url' | 'provider'>): Promise<IJobLinkCheck>
}
