import type { EProvider } from './provider.model'

export enum EJobStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CLOSED = 'CLOSED',
  REMOVED = 'REMOVED',
}

export enum EJobStatusCheckOutcome {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CLOSED = 'CLOSED',
  REMOVED = 'REMOVED',
  RETRY = 'RETRY',
}

export interface IJobStatusCheck {
  outcome: EJobStatusCheckOutcome
  reason: string
  checkedAt: Date
}

export interface IJobStatusTarget {
  url: string
  provider: EProvider
}
