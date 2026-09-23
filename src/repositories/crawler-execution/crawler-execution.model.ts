import type { ICrawlerExecution } from '../../types'

export interface ICrawlerExecutionRepository {
  create(): Promise<string>
  markSuccess(id: string): Promise<void>
  markFailed(id: string, error: string): Promise<void>
  getLatestExecution(): Promise<ICrawlerExecution | undefined>
}
