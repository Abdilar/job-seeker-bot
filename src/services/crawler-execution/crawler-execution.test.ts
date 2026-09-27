import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ECrawlerStatus } from '../../types'
import type { ICrawlerExecution } from '../../types'
import type { ICrawlerExecutionRepository } from '../../repositories'
import { CrawlerExecutionService } from './crawler-execution.service'

describe('CrawlerExecutionService', () => {
  const createMock = vi.fn<ICrawlerExecutionRepository['create']>()
  const markSuccessMock = vi.fn<ICrawlerExecutionRepository['markSuccess']>()
  const markFailedMock = vi.fn<ICrawlerExecutionRepository['markFailed']>()
  const getLatestExecutionMock = vi.fn<ICrawlerExecutionRepository['getLatestExecution']>()
  const recoverInterruptedExecutionsMock =
    vi.fn<ICrawlerExecutionRepository['recoverInterruptedExecutions']>()

  const repository: ICrawlerExecutionRepository = {
    create: createMock,
    markSuccess: markSuccessMock,
    markFailed: markFailedMock,
    getLatestExecution: getLatestExecutionMock,
    recoverInterruptedExecutions: recoverInterruptedExecutionsMock,
  }

  const service = new CrawlerExecutionService(repository)

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('start', () => {
    it('creates a new execution and returns its ID', async () => {
      createMock.mockResolvedValue('execution-123')
      const result = await service.start()

      expect(createMock).toHaveBeenCalledOnce()
      expect(result).toBe('execution-123')
    })

    it('propagates repository errors', async () => {
      const error = new Error('Database connection failed')

      createMock.mockRejectedValue(error)
      await expect(service.start()).rejects.toThrow('Database connection failed')
    })
  })

  describe('success', () => {
    it('marks execution as successful', async () => {
      await service.success('execution-123')

      expect(markSuccessMock).toHaveBeenCalledExactlyOnceWith('execution-123')
    })
  })

  describe('failed', () => {
    it('marks execution as failed with an error message', async () => {
      await service.failed('execution-123', 'Browser crashed')

      expect(markFailedMock).toHaveBeenCalledExactlyOnceWith('execution-123', 'Browser crashed')
    })
  })

  describe('getLatestExecution', () => {
    it('returns the latest execution', async () => {
      const execution: ICrawlerExecution = {
        id: 'execution-123',
        status: ECrawlerStatus.SUCCESS,
        startedAt: new Date('2026-09-24T10:00:00.000Z'),
        finishedAt: new Date('2026-09-24T10:05:00.000Z'),
        createdAt: new Date('2026-09-24T10:00:00.000Z'),
      }

      getLatestExecutionMock.mockResolvedValue(execution)
      const result = await service.getLatestExecution()

      expect(getLatestExecutionMock).toHaveBeenCalledOnce()
      expect(result).toEqual(execution)
    })

    it('returns undefined when no execution exists', async () => {
      getLatestExecutionMock.mockResolvedValue(undefined)
      const result = await service.getLatestExecution()

      expect(result).toBeUndefined()
    })
  })

  describe('recoverInterruptedExecutions', () => {
    it('returns the number of recovered executions', async () => {
      recoverInterruptedExecutionsMock.mockResolvedValue(3)
      const result = await service.recoverInterruptedExecutions()

      expect(recoverInterruptedExecutionsMock).toHaveBeenCalledOnce()
      expect(result).toBe(3)
    })

    it('returns zero when no interrupted executions exist', async () => {
      recoverInterruptedExecutionsMock.mockResolvedValue(0)
      const result = await service.recoverInterruptedExecutions()

      expect(result).toBe(0)
    })
  })
})
