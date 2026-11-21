export interface ExpireJobsOptions {
  ttlDays: number
}

export interface ExpireJobsResult {
  cutoff: Date
  expired: number
}

export interface IExpireJobsTask {
  run(): Promise<ExpireJobsResult>
}
