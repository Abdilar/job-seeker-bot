import type { ICrawlerExecution } from '../../types'

export type CrawlerHealthStatusType = 'HEALTHY' | 'PENDING' | 'FAILED' | 'OVERDUE'

export interface IExecutionReader {
  getLatestExecution(): Promise<ICrawlerExecution | undefined>
}

export interface ICrawlerHealthResult {
  status: CrawlerHealthStatusType
  message: string
  execution?: ICrawlerExecution
}

export interface ICrawlerExecutionService {
  start(): Promise<string>
  success(id: string): Promise<void>
  failed(id: string, error: string): Promise<void>
  getLatestExecution(): Promise<ICrawlerExecution | undefined>
  recoverInterruptedExecutions(): Promise<number>
}

export interface ICrawlerExecutionHealthService {
  check(): Promise<ICrawlerHealthResult>
}
