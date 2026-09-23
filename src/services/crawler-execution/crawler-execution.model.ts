import type { ICrawlerExecution } from '../../types'

export interface ICrawlerExecutionService {
  start(): Promise<string>
  success(id: string): Promise<void>
  failed(id: string, error: string): Promise<void>
  getLatestExecution(): Promise<ICrawlerExecution | undefined>
}
