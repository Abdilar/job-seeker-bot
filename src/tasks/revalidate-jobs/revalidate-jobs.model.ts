import type { EProvider } from '../../types'

export interface RevalidateJobsOptions {
  providers: EProvider[]
  batchSize: number
  staleAfterDays: number
}

export interface RevalidateJobsResult {
  checked: number
  active: number
  expired: number
  closed: number
  removed: number
  retry: number
  errors: number
}

export interface IRevalidateJobsTask {
  run(): Promise<RevalidateJobsResult>
}
