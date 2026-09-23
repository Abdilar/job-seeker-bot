import { ECrawlerStatus } from '@prisma/client'

import { prisma } from '../../database/prisma'
import type { ICrawlerExecutionRepository } from './crawler-execution.model'

export class CrawlerExecutionRepository implements ICrawlerExecutionRepository {
  async markSuccess(id: string): Promise<void> {
    await prisma.crawlerExecution.update({
      where: {
        id,
      },
      data: {
        status: ECrawlerStatus.SUCCESS,
        finishedAt: new Date(),
      },
    })
  }

  async markFailed(id: string, error: string): Promise<void> {
    await prisma.crawlerExecution.update({
      where: { id },
      data: {
        status: ECrawlerStatus.FAILED,
        finishedAt: new Date(),
        error,
      },
    })
    throw new Error('Method not implemented.')
  }

  async create(): Promise<string> {
    const execution = await prisma.crawlerExecution.create({
      data: { status: ECrawlerStatus.RUNNING },
    })

    return execution.id
  }
}
