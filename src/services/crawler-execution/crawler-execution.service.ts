import type { ICrawlerExecutionService } from './crawler-execution.model'
import type { CrawlerExecutionRepository } from '../../repositories'
import type { ICrawlerExecution } from '../../types'

export class CrawlerExecutionService implements ICrawlerExecutionService {
  constructor(private readonly repository: CrawlerExecutionRepository) {}

  async start(): Promise<string> {
    return this.repository.create()
  }

  async success(id: string): Promise<void> {
    await this.repository.markSuccess(id)
  }

  async failed(id: string, error: string): Promise<void> {
    await this.repository.markFailed(id, error)
  }

  async getLatestExecution(): Promise<ICrawlerExecution | undefined> {
    return this.repository.getLatestExecution()
  }

  async recoverInterruptedExecutions(): Promise<number> {
    return this.repository.recoverInterruptedExecutions()
  }
}
