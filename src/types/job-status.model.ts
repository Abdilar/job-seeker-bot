import type { EProvider } from './provider.model'

export enum EJobStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CLOSED = 'CLOSED',
  REMOVED = 'REMOVED',
  UNKNOWN = 'UNKNOWN',
}

export interface IJobStatusCheck {
  status: EJobStatus
  reason: string
  checkedAt: Date
}

export interface IJobStatusTarget {
  url: string
  provider: EProvider
}
