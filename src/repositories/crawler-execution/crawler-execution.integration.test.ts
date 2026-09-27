import { beforeEach, describe, expect, it } from 'vitest'
import { ECrawlerStatus as EPrismaCrawlerStatus } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { ECrawlerStatus } from '../../types'
import { CrawlerExecutionRepository } from './crawler-execution.repository'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined')
}

if (!new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error('Integration tests must run against a test database')
}

describe('CrawlerExecutionRepository integration', () => {
  const repository = new CrawlerExecutionRepository()

  beforeEach(async () => {
    await prisma.crawlerExecution.deleteMany()
  })

  describe('create', () => {
    it('creates a RUNNING execution and returns its id', async () => {
      const id = await repository.create()

      const execution = await prisma.crawlerExecution.findUnique({
        where: { id },
      })

      expect(execution).not.toBeNull()
      expect(execution?.status).toBe(EPrismaCrawlerStatus.RUNNING)
      expect(execution?.startedAt).toBeInstanceOf(Date)
      expect(execution?.finishedAt).toBeNull()
      expect(execution?.error).toBeNull()
    })
  })

  describe('markSuccess', () => {
    it('marks a running execution as SUCCESS', async () => {
      const id = await repository.create()

      await repository.markSuccess(id)

      const execution = await prisma.crawlerExecution.findUnique({
        where: { id },
      })

      expect(execution?.status).toBe(EPrismaCrawlerStatus.SUCCESS)
      expect(execution?.finishedAt).toBeInstanceOf(Date)
      expect(execution?.error).toBeNull()
    })
  })

  describe('markFailed', () => {
    it('marks a running execution as FAILED and stores the error', async () => {
      const id = await repository.create()

      await repository.markFailed(id, 'Crawler failed')

      const execution = await prisma.crawlerExecution.findUnique({
        where: { id },
      })

      expect(execution?.status).toBe(EPrismaCrawlerStatus.FAILED)
      expect(execution?.finishedAt).toBeInstanceOf(Date)
      expect(execution?.error).toBe('Crawler failed')
    })
  })

  describe('getLatestExecution', () => {
    it('returns undefined when there are no executions', async () => {
      const result = await repository.getLatestExecution()

      expect(result).toBeUndefined()
    })

    it('returns the latest execution', async () => {
      await prisma.crawlerExecution.create({
        data: {
          status: EPrismaCrawlerStatus.SUCCESS,
          startedAt: new Date('2026-09-25T10:00:00.000Z'),
          finishedAt: new Date('2026-09-25T10:10:00.000Z'),
        },
      })

      const latest = await prisma.crawlerExecution.create({
        data: {
          status: EPrismaCrawlerStatus.FAILED,
          startedAt: new Date('2026-09-26T10:00:00.000Z'),
          finishedAt: new Date('2026-09-26T10:10:00.000Z'),
          error: 'Something went wrong',
        },
      })

      const result = await repository.getLatestExecution()

      expect(result).toEqual({
        id: latest.id,
        status: ECrawlerStatus.FAILED,
        startedAt: latest.startedAt,
        finishedAt: latest.finishedAt,
        error: 'Something went wrong',
        createdAt: latest.createdAt,
      })
    })
  })

  describe('recoverInterruptedExecutions', () => {
    it('marks all RUNNING executions as FAILED', async () => {
      await prisma.crawlerExecution.createMany({
        data: [
          {
            status: EPrismaCrawlerStatus.RUNNING,
          },
          {
            status: EPrismaCrawlerStatus.RUNNING,
          },
          {
            status: EPrismaCrawlerStatus.SUCCESS,
            finishedAt: new Date(),
          },
        ],
      })

      const count = await repository.recoverInterruptedExecutions()

      expect(count).toBe(2)

      const executions = await prisma.crawlerExecution.findMany({
        orderBy: {
          startedAt: 'asc',
        },
      })

      const failedExecutions = executions.filter(
        (execution) => execution.status === EPrismaCrawlerStatus.FAILED,
      )

      const successExecutions = executions.filter(
        (execution) => execution.status === EPrismaCrawlerStatus.SUCCESS,
      )

      expect(failedExecutions).toHaveLength(2)

      for (const execution of failedExecutions) {
        expect(execution.finishedAt).toBeInstanceOf(Date)
        expect(execution.error).toBe('Crawler execution interrupted unexpectedly')
      }

      expect(successExecutions).toHaveLength(1)
    })

    it('returns zero when there are no interrupted executions', async () => {
      await prisma.crawlerExecution.create({
        data: {
          status: EPrismaCrawlerStatus.SUCCESS,
          finishedAt: new Date(),
        },
      })

      const count = await repository.recoverInterruptedExecutions()

      expect(count).toBe(0)
    })
  })
})
