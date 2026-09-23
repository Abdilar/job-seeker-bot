import type { CrawlerExecution } from '@prisma/client'
import { ECrawlerStatus as EPrismaCrawlerStatus } from '@prisma/client'

import { prisma } from '../../database/prisma'
import type { ICrawlerExecutionRepository } from './crawler-execution.model'
import type { ICrawlerExecution } from '../../types'
import { ECrawlerStatus as EDomainCrawlerStatus } from '../../types'

const prismaCrawlerStatusMap = {
  [EDomainCrawlerStatus.FAILED]: EPrismaCrawlerStatus.FAILED,
  [EDomainCrawlerStatus.SUCCESS]: EPrismaCrawlerStatus.SUCCESS,
  [EDomainCrawlerStatus.RUNNING]: EPrismaCrawlerStatus.RUNNING,
}

export class CrawlerExecutionRepository implements ICrawlerExecutionRepository {
  async markSuccess(id: string): Promise<void> {
    await prisma.crawlerExecution.update({
      where: {
        id,
      },
      data: {
        status: prismaCrawlerStatusMap[EDomainCrawlerStatus.SUCCESS],
        finishedAt: new Date(),
      },
    })
  }

  async markFailed(id: string, error: string): Promise<void> {
    await prisma.crawlerExecution.update({
      where: { id },
      data: {
        status: prismaCrawlerStatusMap[EDomainCrawlerStatus.FAILED],
        finishedAt: new Date(),
        error,
      },
    })
  }

  async create(): Promise<string> {
    const execution = await prisma.crawlerExecution.create({
      data: { status: prismaCrawlerStatusMap[EDomainCrawlerStatus.RUNNING] },
    })

    return execution.id
  }

  async getLatestExecution(): Promise<ICrawlerExecution | undefined> {
    const result = await prisma.crawlerExecution.findFirst({
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    })

    return this.convertPrismaCrawlerExecutionToICrawlerExecution(result)
  }

  async recoverInterruptedExecutions(): Promise<number> {
    const result = await prisma.crawlerExecution.updateMany({
      where: {
        status: EPrismaCrawlerStatus.RUNNING,
      },
      data: {
        status: EPrismaCrawlerStatus.FAILED,
        finishedAt: new Date(),
        error: 'Crawler execution interrupted unexpectedly',
      },
    })

    return result.count
  }

  private convertPrismaCrawlerExecutionToICrawlerExecution(
    data: CrawlerExecution | null,
  ): ICrawlerExecution | undefined {
    return data
      ? {
          ...data,
          status: EDomainCrawlerStatus[data.status],
          finishedAt: data.finishedAt ?? undefined,
          error: data.error ?? undefined,
        }
      : undefined
  }
}
