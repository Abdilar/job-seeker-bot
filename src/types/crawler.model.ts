export enum ECrawlerStatus {
  FAILED = 'failed',
  SUCCESS = 'success',
  RUNNING = 'running',
}

export interface ICrawlerExecution {
  id: string
  status: ECrawlerStatus
  startedAt: Date
  finishedAt?: Date
  error?: string
  createdAt: Date
}
