import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ECrawlerStatus } from '../../types'
import type { ICrawlerExecution } from '../../types'
import type { IExecutionReader } from './crawler-execution.model'
import { CrawlerExecutionHealthService } from './crawler-execution-health.service'

describe('CrawlerExecutionHealthService', () => {
  const getLatestExecution = vi.fn<IExecutionReader['getLatestExecution']>()

  const executionReader: IExecutionReader = {
    getLatestExecution,
  }

  const healthService = new CrawlerExecutionHealthService(executionReader)

  const createExecution = (overrides: Partial<ICrawlerExecution> = {}): ICrawlerExecution => ({
    id: 'execution-1',
    status: ECrawlerStatus.RUNNING,
    startedAt: new Date('2026-09-24T06:30:00.000Z'),
    createdAt: new Date('2026-09-24T06:30:00.000Z'),
    ...overrides,
  })

  beforeEach(() => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2026-09-24T10:00:00.000Z'))

    vi.stubEnv('CRAWLER_DEADLINE_TIME', '21:00')

    getLatestExecution.mockReset()
    getLatestExecution.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  describe('No execution', () => {
    it('returns PENDING before deadline', async () => {
      const result = await healthService.check()

      expect(result).toEqual({
        status: 'PENDING',
        message: 'No crawler execution found',
      })
    })

    it('returns OVERDUE after deadline', async () => {
      vi.setSystemTime(new Date('2026-09-24T18:00:00.000Z'))

      const result = await healthService.check()

      expect(result).toEqual({
        status: 'OVERDUE',
        message: 'No crawler execution found',
      })
    })

    it('returns OVERDUE exactly at deadline', async () => {
      // 21:00 in Tehran = 17:30 UTC
      vi.setSystemTime(new Date('2026-09-24T17:30:00.000Z'))

      const result = await healthService.check()

      expect(result.status).toBe('OVERDUE')
    })
  })

  describe('Previous execution', () => {
    it('returns PENDING when latest execution is from yesterday', async () => {
      getLatestExecution.mockResolvedValue(
        createExecution({
          startedAt: new Date('2026-09-23T06:30:00.000Z'),
        }),
      )

      const result = await healthService.check()

      expect(result.status).toBe('PENDING')
      expect(result.message).toBe('Crawler has not executed today')
    })

    it('returns OVERDUE when latest execution is from yesterday', async () => {
      vi.setSystemTime(new Date('2026-09-24T18:00:00.000Z'))

      getLatestExecution.mockResolvedValue(
        createExecution({
          startedAt: new Date('2026-09-23T06:30:00.000Z'),
        }),
      )

      const result = await healthService.check()

      expect(result.status).toBe('OVERDUE')
    })
  })

  describe('Successful execution', () => {
    it('returns HEALTHY when crawler completed successfully today', async () => {
      const execution = createExecution({
        status: ECrawlerStatus.SUCCESS,
      })

      getLatestExecution.mockResolvedValue(execution)

      const result = await healthService.check()

      expect(result).toEqual({
        status: 'HEALTHY',
        message: 'Crawler completed successfully',
        execution,
      })
    })
  })

  describe('Failed execution', () => {
    it('returns FAILED with execution error', async () => {
      const execution = createExecution({
        status: ECrawlerStatus.FAILED,
        error: 'Browser crashed',
      })

      getLatestExecution.mockResolvedValue(execution)

      const result = await healthService.check()

      expect(result).toEqual({
        status: 'FAILED',
        message: 'Browser crashed',
        execution,
      })
    })

    it('returns FAILED with default message when error is missing', async () => {
      getLatestExecution.mockResolvedValue(
        createExecution({
          status: ECrawlerStatus.FAILED,
        }),
      )

      const result = await healthService.check()

      expect(result.status).toBe('FAILED')
      expect(result.message).toBe('Crawler execution failed')
    })
  })

  describe('Running execution', () => {
    it('returns PENDING when crawler is running before deadline', async () => {
      getLatestExecution.mockResolvedValue(createExecution())

      const result = await healthService.check()

      expect(result.status).toBe('PENDING')
      expect(result.message).toBe('Crawler execution is in progress')
    })

    it('returns OVERDUE when crawler is running after deadline', async () => {
      vi.setSystemTime(new Date('2026-09-24T18:00:00.000Z'))

      getLatestExecution.mockResolvedValue(createExecution())

      const result = await healthService.check()

      expect(result.status).toBe('OVERDUE')
      expect(result.message).toBe('Crawler execution exceeded its deadline')
    })
  })

  describe('Deadline configuration', () => {
    it('throws when deadline format is invalid', async () => {
      vi.stubEnv('CRAWLER_DEADLINE_TIME', '25:00')

      await expect(healthService.check()).rejects.toThrow('Invalid CRAWLER_DEADLINE_TIME')
    })

    it('uses default deadline when environment variable is missing', async () => {
      vi.stubEnv('CRAWLER_DEADLINE_TIME', undefined)

      // Default deadline is 21:00 Tehran.
      vi.setSystemTime(new Date('2026-09-24T17:30:00.000Z'))

      const result = await healthService.check()

      expect(result.status).toBe('OVERDUE')
    })
  })

  describe('Timezone', () => {
    it('uses Tehran date instead of UTC date', async () => {
      // 2026-09-23 21:00 UTC
      // = 2026-09-24 00:30 Tehran

      vi.setSystemTime(new Date('2026-09-23T21:00:00.000Z'))

      const execution = createExecution({
        status: ECrawlerStatus.SUCCESS,
        startedAt: new Date('2026-09-23T20:45:00.000Z'),
      })

      getLatestExecution.mockResolvedValue(execution)

      const result = await healthService.check()

      expect(result.status).toBe('HEALTHY')
    })
  })
})
