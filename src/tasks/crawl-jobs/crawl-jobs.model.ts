export interface ICrawlJobsTask {
  runSummary(): Promise<void>
  runDetail(): Promise<void>
}
