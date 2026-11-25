import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import cron from 'node-cron'
import type { ICrawlJobsTask } from '../../tasks'
import type { ICrawlerExecutionService } from '../../services'
import { randomDelay } from '../../utilities'
import { ECrawlJobMode, TEHRAN_TIMEZONE } from '../../constants'
import { CrawlerScheduler } from './crawler.scheduler'

vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  },
}))

vi.mock('../../utilities', () => ({
  randomDelay: vi.fn(),
}))

type ScheduledCallback = () => Promise<void>

describe('CrawlerScheduler', () => {
  let scheduler: CrawlerScheduler
  let consoleLogSpy: MockInstance<Console['log']>
  let consoleErrorSpy: MockInstance<Console['error']>

  const executionId = 'execution-1'

  const crawlJobs = {
    runSummary: vi.fn<ICrawlJobsTask['runSummary']>(),
    runDetail: vi.fn<ICrawlJobsTask['runDetail']>(),
  } satisfies ICrawlJobsTask

  const executionService = {
    start: vi.fn<ICrawlerExecutionService['start']>(),
    success: vi.fn<ICrawlerExecutionService['success']>(),
    failed: vi.fn<ICrawlerExecutionService['failed']>(),
    getLatestExecution: vi.fn<ICrawlerExecutionService['getLatestExecution']>(),
    recoverInterruptedExecutions: vi.fn<ICrawlerExecutionService['recoverInterruptedExecutions']>(),
  } satisfies ICrawlerExecutionService

  const scheduleMock = vi.mocked(cron.schedule)
  const randomDelayMock = vi.mocked(randomDelay)

  const getScheduledCallback = (mode: ECrawlJobMode): ScheduledCallback => {
    const index = mode === ECrawlJobMode.SUMMARY ? 0 : 1

    const callback = scheduleMock.mock.calls[index]?.[1]

    if (typeof callback !== 'function') {
      throw new Error(`Scheduled callback not found: ${mode}`)
    }

    return callback as ScheduledCallback
  }

  const runSummary = (): Promise<void> => getScheduledCallback(ECrawlJobMode.SUMMARY)()

  const runDetail = (): Promise<void> => getScheduledCallback(ECrawlJobMode.DETAIL)()

  const createDeferred = () => {
    let resolve!: () => void

    const promise = new Promise<void>((resolvePromise) => {
      resolve = resolvePromise
    })

    return { promise, resolve }
  }

  beforeEach(() => {
    vi.resetAllMocks()

    vi.stubEnv('JOB_SUMMARY_SCHEDULE_TIME', '')
    vi.stubEnv('JOB_DETAIL_SCHEDULE_TIME', '')

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    crawlJobs.runSummary.mockResolvedValue(undefined)
    crawlJobs.runDetail.mockResolvedValue(undefined)

    executionService.start.mockResolvedValue(executionId)
    executionService.success.mockResolvedValue(undefined)
    executionService.failed.mockResolvedValue(undefined)

    scheduler = new CrawlerScheduler(crawlJobs, executionService)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  describe('start', () => {
    it('should register two scheduled tasks', () => {
      scheduler.start()

      expect(scheduleMock).toHaveBeenCalledTimes(2)
    })

    it('should use the default summary schedule', () => {
      scheduler.start()

      expect(scheduleMock).toHaveBeenNthCalledWith(1, '0 10 * * *', expect.any(Function), {
        timezone: TEHRAN_TIMEZONE,
      })
    })

    it('should use the default detail schedule', () => {
      scheduler.start()

      expect(scheduleMock).toHaveBeenNthCalledWith(2, '0 14 * * *', expect.any(Function), {
        timezone: TEHRAN_TIMEZONE,
      })
    })

    it('should use the summary schedule from environment variables', () => {
      vi.stubEnv('JOB_SUMMARY_SCHEDULE_TIME', '0 8 * * *')

      scheduler.start()

      expect(scheduleMock).toHaveBeenNthCalledWith(1, '0 8 * * *', expect.any(Function), {
        timezone: TEHRAN_TIMEZONE,
      })
    })

    it('should use the detail schedule from environment variables', () => {
      vi.stubEnv('JOB_DETAIL_SCHEDULE_TIME', '0 */6 * * *')

      scheduler.start()

      expect(scheduleMock).toHaveBeenNthCalledWith(2, '0 */6 * * *', expect.any(Function), {
        timezone: TEHRAN_TIMEZONE,
      })
    })

    it('should use the Tehran timezone for both tasks', () => {
      scheduler.start()

      for (const [, , options] of scheduleMock.mock.calls) {
        expect(options).toEqual({
          timezone: TEHRAN_TIMEZONE,
        })
      }
    })

    it('should not execute tasks immediately', () => {
      scheduler.start()

      expect(crawlJobs.runSummary).not.toHaveBeenCalled()
      expect(crawlJobs.runDetail).not.toHaveBeenCalled()
      expect(executionService.start).not.toHaveBeenCalled()
      expect(randomDelayMock).not.toHaveBeenCalled()
    })
  })

  describe('summary task', () => {
    beforeEach(() => {
      scheduler.start()
    })

    it('should execute the summary task', async () => {
      await runSummary()

      expect(crawlJobs.runSummary).toHaveBeenCalledTimes(1)
      expect(crawlJobs.runDetail).not.toHaveBeenCalled()
    })

    it('should start an execution record', async () => {
      await runSummary()

      expect(executionService.start).toHaveBeenCalledTimes(1)
      expect(executionService.start).toHaveBeenCalledWith()
    })

    it('should apply random delay before crawling', async () => {
      await runSummary()

      expect(randomDelayMock).toHaveBeenCalledTimes(1)
      expect(randomDelayMock).toHaveBeenCalledWith(0, 0)
    })

    it('should mark the execution as successful', async () => {
      await runSummary()

      expect(executionService.success).toHaveBeenCalledTimes(1)
      expect(executionService.success).toHaveBeenCalledWith(executionId)

      expect(executionService.failed).not.toHaveBeenCalled()
    })

    it('should execute operations in the correct order', async () => {
      await runSummary()

      expect(executionService.start.mock.invocationCallOrder[0]).toBeLessThan(
        randomDelayMock.mock.invocationCallOrder[0],
      )

      expect(randomDelayMock.mock.invocationCallOrder[0]).toBeLessThan(
        crawlJobs.runSummary.mock.invocationCallOrder[0],
      )

      expect(crawlJobs.runSummary.mock.invocationCallOrder[0]).toBeLessThan(
        executionService.success.mock.invocationCallOrder[0],
      )
    })

    it('should wait for crawling to finish before marking success', async () => {
      const crawling = createDeferred()
      const started = createDeferred()

      crawlJobs.runSummary.mockImplementationOnce(() => {
        started.resolve()
        return crawling.promise
      })

      const execution = runSummary()

      await started.promise

      expect(executionService.success).not.toHaveBeenCalled()

      crawling.resolve()

      await execution

      expect(executionService.success).toHaveBeenCalledWith(executionId)
    })
  })

  describe('detail task', () => {
    beforeEach(() => {
      scheduler.start()
    })

    it('should execute the detail task', async () => {
      await runDetail()

      expect(crawlJobs.runDetail).toHaveBeenCalledTimes(1)
      expect(crawlJobs.runSummary).not.toHaveBeenCalled()
    })

    it('should start an execution record', async () => {
      await runDetail()

      expect(executionService.start).toHaveBeenCalledTimes(1)
    })

    it('should apply random delay before crawling', async () => {
      await runDetail()

      expect(randomDelayMock).toHaveBeenCalledWith(0, 0)
    })

    it('should mark the execution as successful', async () => {
      await runDetail()

      expect(executionService.success).toHaveBeenCalledWith(executionId)

      expect(executionService.failed).not.toHaveBeenCalled()
    })

    it('should execute operations in the correct order', async () => {
      await runDetail()

      expect(executionService.start.mock.invocationCallOrder[0]).toBeLessThan(
        randomDelayMock.mock.invocationCallOrder[0],
      )

      expect(randomDelayMock.mock.invocationCallOrder[0]).toBeLessThan(
        crawlJobs.runDetail.mock.invocationCallOrder[0],
      )

      expect(crawlJobs.runDetail.mock.invocationCallOrder[0]).toBeLessThan(
        executionService.success.mock.invocationCallOrder[0],
      )
    })
  })

  describe('concurrency control', () => {
    beforeEach(() => {
      scheduler.start()
    })

    it('should skip summary when another summary is running', async () => {
      const crawling = createDeferred()

      crawlJobs.runSummary.mockReturnValueOnce(crawling.promise)

      const firstExecution = runSummary()

      await runSummary()

      crawling.resolve()

      await firstExecution

      expect(crawlJobs.runSummary).toHaveBeenCalledTimes(1)
      expect(executionService.start).toHaveBeenCalledTimes(1)
      expect(randomDelayMock).toHaveBeenCalledTimes(1)
      expect(executionService.success).toHaveBeenCalledTimes(1)
    })

    it('should skip detail when another detail is running', async () => {
      const crawling = createDeferred()

      crawlJobs.runDetail.mockReturnValueOnce(crawling.promise)

      const firstExecution = runDetail()

      await runDetail()

      crawling.resolve()

      await firstExecution

      expect(crawlJobs.runDetail).toHaveBeenCalledTimes(1)
      expect(executionService.start).toHaveBeenCalledTimes(1)
      expect(executionService.success).toHaveBeenCalledTimes(1)
    })

    it('should log a message when a running task is skipped', async () => {
      const crawling = createDeferred()

      crawlJobs.runSummary.mockReturnValueOnce(crawling.promise)

      const firstExecution = runSummary()

      await runSummary()

      crawling.resolve()

      await firstExecution

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Crawler [${ECrawlJobMode.SUMMARY}] is already running. Skipping...`,
      )
    })

    it('should allow summary and detail tasks to run concurrently', async () => {
      const summary = createDeferred()
      const detail = createDeferred()
      const summaryStarted = createDeferred()
      const detailStarted = createDeferred()

      executionService.start
        .mockResolvedValueOnce('summary-execution')
        .mockResolvedValueOnce('detail-execution')

      crawlJobs.runSummary.mockImplementationOnce(() => {
        summaryStarted.resolve()
        return summary.promise
      })

      crawlJobs.runDetail.mockImplementationOnce(() => {
        detailStarted.resolve()
        return detail.promise
      })

      const summaryExecution = runSummary()
      const detailExecution = runDetail()

      await Promise.all([summaryStarted.promise, detailStarted.promise])

      expect(crawlJobs.runSummary).toHaveBeenCalledTimes(1)
      expect(crawlJobs.runDetail).toHaveBeenCalledTimes(1)
      expect(executionService.start).toHaveBeenCalledTimes(2)
      expect(executionService.success).not.toHaveBeenCalled()

      summary.resolve()
      detail.resolve()

      await Promise.all([summaryExecution, detailExecution])

      expect(executionService.success).toHaveBeenCalledWith('summary-execution')

      expect(executionService.success).toHaveBeenCalledWith('detail-execution')
    })

    it('should allow summary to run again after completion', async () => {
      await runSummary()
      await runSummary()

      expect(crawlJobs.runSummary).toHaveBeenCalledTimes(2)
      expect(executionService.start).toHaveBeenCalledTimes(2)
      expect(executionService.success).toHaveBeenCalledTimes(2)
    })

    it('should allow detail to run again after completion', async () => {
      await runDetail()
      await runDetail()

      expect(crawlJobs.runDetail).toHaveBeenCalledTimes(2)
      expect(executionService.start).toHaveBeenCalledTimes(2)
      expect(executionService.success).toHaveBeenCalledTimes(2)
    })

    it('should keep the task locked while recording success', async () => {
      const recording = createDeferred()
      const recordingStarted = createDeferred()

      executionService.success.mockImplementationOnce(() => {
        recordingStarted.resolve()
        return recording.promise
      })

      const firstExecution = runSummary()

      await recordingStarted.promise

      await runSummary()

      recording.resolve()

      await firstExecution

      expect(crawlJobs.runSummary).toHaveBeenCalledTimes(1)
      expect(executionService.start).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      scheduler.start()
    })

    it('should mark summary execution as failed when crawling fails', async () => {
      const error = new Error('Summary crawling failed')

      crawlJobs.runSummary.mockRejectedValueOnce(error)

      await runSummary()

      expect(executionService.failed).toHaveBeenCalledTimes(1)

      expect(executionService.failed).toHaveBeenCalledWith(
        executionId,
        error.stack ?? error.message,
      )

      expect(executionService.success).not.toHaveBeenCalled()
    })

    it('should mark detail execution as failed when crawling fails', async () => {
      const error = new Error('Detail crawling failed')

      crawlJobs.runDetail.mockRejectedValueOnce(error)

      await runDetail()

      expect(executionService.failed).toHaveBeenCalledWith(
        executionId,
        error.stack ?? error.message,
      )

      expect(executionService.success).not.toHaveBeenCalled()
    })

    it('should log the summary scheduler error', async () => {
      const error = new Error('Summary crawling failed')

      crawlJobs.runSummary.mockRejectedValueOnce(error)

      await runSummary()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Crawler scheduler [${ECrawlJobMode.SUMMARY}] failed:`,
        error,
      )
    })

    it('should log the detail scheduler error', async () => {
      const error = new Error('Detail crawling failed')

      crawlJobs.runDetail.mockRejectedValueOnce(error)

      await runDetail()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Crawler scheduler [${ECrawlJobMode.DETAIL}] failed:`,
        error,
      )
    })

    it('should not propagate errors from the scheduled callback', async () => {
      crawlJobs.runSummary.mockRejectedValueOnce(new Error('Crawling failed'))

      await expect(runSummary()).resolves.toBeUndefined()
    })

    it('should convert non-Error values to strings', async () => {
      crawlJobs.runSummary.mockRejectedValueOnce('Unknown error')

      await runSummary()

      expect(executionService.failed).toHaveBeenCalledWith(executionId, 'Unknown error')
    })

    it('should use the error message when stack is unavailable', async () => {
      const error = new Error('Crawling failed')

      delete error.stack

      crawlJobs.runSummary.mockRejectedValueOnce(error)

      await runSummary()

      expect(executionService.failed).toHaveBeenCalledWith(executionId, error.message)
    })

    it('should not execute crawling when execution start fails', async () => {
      const error = new Error('Failed to create execution')

      executionService.start.mockRejectedValueOnce(error)

      await runSummary()

      expect(randomDelayMock).not.toHaveBeenCalled()
      expect(crawlJobs.runSummary).not.toHaveBeenCalled()
      expect(executionService.success).not.toHaveBeenCalled()
      expect(executionService.failed).not.toHaveBeenCalled()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Crawler scheduler [${ECrawlJobMode.SUMMARY}] failed:`,
        error,
      )
    })

    it('should mark execution as failed when random delay fails', async () => {
      const error = new Error('Random delay failed')

      randomDelayMock.mockRejectedValueOnce(error)

      await runSummary()

      expect(crawlJobs.runSummary).not.toHaveBeenCalled()
      expect(executionService.success).not.toHaveBeenCalled()

      expect(executionService.failed).toHaveBeenCalledWith(
        executionId,
        error.stack ?? error.message,
      )
    })

    it('should mark execution as failed when recording success fails', async () => {
      const error = new Error('Failed to record success')

      executionService.success.mockRejectedValueOnce(error)

      await runSummary()

      expect(crawlJobs.runSummary).toHaveBeenCalledTimes(1)

      expect(executionService.failed).toHaveBeenCalledWith(
        executionId,
        error.stack ?? error.message,
      )
    })

    it('should log errors when recording a failed execution fails', async () => {
      const crawlingError = new Error('Crawling failed')
      const recordError = new Error('Failed to record execution')

      crawlJobs.runSummary.mockRejectedValueOnce(crawlingError)
      executionService.failed.mockRejectedValueOnce(recordError)

      await runSummary()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to record crawler execution:',
        recordError,
      )

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Crawler scheduler [${ECrawlJobMode.SUMMARY}] failed:`,
        crawlingError,
      )
    })

    it('should release the summary lock after crawling fails', async () => {
      crawlJobs.runSummary.mockRejectedValueOnce(new Error('Crawling failed'))

      await runSummary()
      await runSummary()

      expect(crawlJobs.runSummary).toHaveBeenCalledTimes(2)
      expect(executionService.start).toHaveBeenCalledTimes(2)
      expect(executionService.failed).toHaveBeenCalledTimes(1)
      expect(executionService.success).toHaveBeenCalledTimes(1)
    })

    it('should release the detail lock after crawling fails', async () => {
      crawlJobs.runDetail.mockRejectedValueOnce(new Error('Crawling failed'))

      await runDetail()
      await runDetail()

      expect(crawlJobs.runDetail).toHaveBeenCalledTimes(2)
      expect(executionService.failed).toHaveBeenCalledTimes(1)
      expect(executionService.success).toHaveBeenCalledTimes(1)
    })

    it('should release the lock when execution start fails', async () => {
      executionService.start.mockRejectedValueOnce(new Error('Execution start failed'))

      await runSummary()
      await runSummary()

      expect(executionService.start).toHaveBeenCalledTimes(2)
      expect(crawlJobs.runSummary).toHaveBeenCalledTimes(1)
      expect(executionService.success).toHaveBeenCalledTimes(1)
    })

    it('should release the lock when recording failure also fails', async () => {
      crawlJobs.runSummary.mockRejectedValueOnce(new Error('Crawling failed'))

      executionService.failed.mockRejectedValueOnce(new Error('Recording failed'))

      await runSummary()
      await runSummary()

      expect(crawlJobs.runSummary).toHaveBeenCalledTimes(2)
      expect(executionService.start).toHaveBeenCalledTimes(2)
      expect(executionService.success).toHaveBeenCalledTimes(1)
    })
  })
})
