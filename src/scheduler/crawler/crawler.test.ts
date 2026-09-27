import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import cron from 'node-cron'
import { randomDelay } from '../../utilities'
import type { ICrawlJobsTask } from '../../tasks'
import type { ICrawlerExecutionService } from '../../services'
import { CrawlerScheduler } from './crawler.scheduler'

vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  },
}))

vi.mock('../../utilities', () => ({
  randomDelay: vi.fn(),
}))

describe('CrawlerScheduler', () => {
  const scheduleMock = vi.mocked(cron.schedule)
  const randomDelayMock = vi.mocked(randomDelay)
  const crawlJobsMock = vi.fn<ICrawlJobsTask['run']>()
  const startMock = vi.fn<ICrawlerExecutionService['start']>()
  const successMock = vi.fn<ICrawlerExecutionService['success']>()
  const failedMock = vi.fn<ICrawlerExecutionService['failed']>()
  const getLatestExecutionMock = vi.fn<ICrawlerExecutionService['getLatestExecution']>()
  const recoverInterruptedExecutionsMock =
    vi.fn<ICrawlerExecutionService['recoverInterruptedExecutions']>()
  const crawlJobs: ICrawlJobsTask = {
    run: crawlJobsMock,
  }

  const executionService: ICrawlerExecutionService = {
    start: startMock,
    success: successMock,
    failed: failedMock,
    getLatestExecution: getLatestExecutionMock,
    recoverInterruptedExecutions: recoverInterruptedExecutionsMock,
  }
  const scheduler = new CrawlerScheduler(crawlJobs, executionService)
  let cronCallback: () => Promise<void>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('JOB_IN_JA_SCHEDULE_TIME', '0 10 * * *')

    startMock.mockResolvedValue('execution-123')
    successMock.mockResolvedValue(undefined)
    failedMock.mockResolvedValue(undefined)
    crawlJobsMock.mockResolvedValue(undefined)
    randomDelayMock.mockResolvedValue(undefined)

    scheduleMock.mockImplementation((_expression, callback) => {
      cronCallback = callback as () => Promise<void>
      return {} as ReturnType<typeof cron.schedule>
    })

    scheduler.start()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('start', () => {
    it('registers cron with Tehran timezone', () => {
      expect(scheduleMock).toHaveBeenCalledExactlyOnceWith('0 10 * * *', expect.any(Function), {
        timezone: 'Asia/Tehran',
      })
    })

    it('does not execute crawler immediately', () => {
      expect(crawlJobsMock).not.toHaveBeenCalled()
      expect(startMock).not.toHaveBeenCalled()
    })

    it('rejects schedules at or after 23:00', () => {
      vi.stubEnv('JOB_IN_JA_SCHEDULE_TIME', '0 23 * * *')

      expect(() => scheduler.start()).toThrow('Crawler schedule must be daily and before 23:00')
    })

    it.each(['60 10 * * *', '0 24 * * *', '* 10 * * *', '0 10 1 * *', 'invalid'])(
      'rejects invalid schedule: %s',
      (schedule) => {
        vi.stubEnv('JOB_IN_JA_SCHEDULE_TIME', schedule)

        expect(() => scheduler.start()).toThrow('Crawler schedule must be daily and before 23:00')
      },
    )
  })

  describe('successful execution', () => {
    it('records execution and marks it successful', async () => {
      await cronCallback()

      expect(startMock).toHaveBeenCalledOnce()
      expect(randomDelayMock).toHaveBeenCalledExactlyOnceWith(0, 0)
      expect(crawlJobsMock).toHaveBeenCalledOnce()
      expect(successMock).toHaveBeenCalledExactlyOnceWith('execution-123')
      expect(failedMock).not.toHaveBeenCalled()
    })

    it('executes crawler again after previous run completes', async () => {
      await cronCallback()
      await cronCallback()

      expect(crawlJobsMock).toHaveBeenCalledTimes(2)
      expect(startMock).toHaveBeenCalledTimes(2)
      expect(successMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('failed execution', () => {
    it('records FAILED when crawler throws an error', async () => {
      const error = new Error('Browser crashed')

      crawlJobsMock.mockRejectedValueOnce(error)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        await cronCallback()

        expect(failedMock).toHaveBeenCalledOnce()
        expect(failedMock).toHaveBeenCalledWith(
          'execution-123',
          expect.stringContaining('Browser crashed'),
        )
        expect(successMock).not.toHaveBeenCalled()
      } finally {
        consoleSpy.mockRestore()
      }
    })

    it('does not crawl when execution creation fails', async () => {
      startMock.mockRejectedValueOnce(new Error('Database unavailable'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        await cronCallback()

        expect(crawlJobsMock).not.toHaveBeenCalled()
        expect(successMock).not.toHaveBeenCalled()
        expect(failedMock).not.toHaveBeenCalled()
      } finally {
        consoleSpy.mockRestore()
      }
    })

    it('records FAILED when marking success fails', async () => {
      successMock.mockRejectedValueOnce(new Error('Database write failed'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        await cronCallback()

        expect(failedMock).toHaveBeenCalledOnce()
        expect(failedMock).toHaveBeenCalledWith(
          'execution-123',
          expect.stringContaining('Database write failed'),
        )
      } finally {
        consoleSpy.mockRestore()
      }
    })

    it('logs an error when recording FAILED also fails', async () => {
      crawlJobsMock.mockRejectedValueOnce(new Error('Crawler failed'))
      failedMock.mockRejectedValueOnce(new Error('Database unavailable'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        await cronCallback()

        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to record crawler execution:',
          expect.any(Error),
        )
        expect(consoleSpy).toHaveBeenCalledWith('Crawler scheduler failed:', expect.any(Error))
      } finally {
        consoleSpy.mockRestore()
      }
    })
  })

  describe('concurrent execution', () => {
    it('prevents concurrent crawler executions', async () => {
      let finishCrawl!: () => void

      crawlJobsMock.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finishCrawl = resolve
          }),
      )

      const firstRun = cronCallback()

      // Allow the first run to reach crawlJobs.run()
      await vi.waitFor(() => {
        expect(crawlJobsMock).toHaveBeenCalledOnce()
      })

      const secondRun = cronCallback()

      await secondRun

      expect(startMock).toHaveBeenCalledOnce()
      expect(crawlJobsMock).toHaveBeenCalledOnce()
      finishCrawl()
      await firstRun
      expect(successMock).toHaveBeenCalledOnce()
    })
  })
})
