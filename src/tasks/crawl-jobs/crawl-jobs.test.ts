import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { JobProvider } from '../../crawlers'
import type { IJobService } from '../../services'
import { CrawlJobsTask } from './crawl-jobs.task'

describe('CrawlJobsTask', () => {
  let task: CrawlJobsTask

  const createProvider = () => ({
    crawlJobs: vi.fn<JobProvider['crawlJobs']>(),
    crawlJobDetail: vi.fn<JobProvider['crawlJobDetail']>(),
    closeBrowser: vi.fn<JobProvider['closeBrowser']>(),
  })

  const firstProvider = createProvider()
  const secondProvider = createProvider()

  const jobService = {
    saveAll: vi.fn<IJobService['saveAll']>(),
  }

  const firstProviderJobs = [
    {
      title: 'Frontend Developer',
      url: 'https://example.com/jobs/1',
    },
  ] as Awaited<ReturnType<JobProvider['crawlJobs']>>

  const secondProviderJobs = [
    {
      title: 'Backend Developer',
      url: 'https://example.com/jobs/2',
    },
  ] as Awaited<ReturnType<JobProvider['crawlJobs']>>

  const createTask = (
    providers: ReturnType<typeof createProvider>[] = [firstProvider, secondProvider],
  ): CrawlJobsTask => {
    return new CrawlJobsTask(
      jobService as unknown as IJobService,
      providers as unknown as JobProvider[],
    )
  }

  beforeEach(() => {
    vi.resetAllMocks()

    vi.spyOn(console, 'log').mockImplementation(() => {})

    firstProvider.crawlJobs.mockResolvedValue(firstProviderJobs)
    secondProvider.crawlJobs.mockResolvedValue(secondProviderJobs)

    firstProvider.crawlJobDetail.mockResolvedValue([])
    secondProvider.crawlJobDetail.mockResolvedValue([])

    firstProvider.closeBrowser.mockResolvedValue(undefined)
    secondProvider.closeBrowser.mockResolvedValue(undefined)

    task = createTask()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('runSummary', () => {
    it('should crawl jobs from all providers', async () => {
      await task.runSummary()

      expect(firstProvider.crawlJobs).toHaveBeenCalledTimes(1)
      expect(secondProvider.crawlJobs).toHaveBeenCalledTimes(1)
    })

    it('should save crawled jobs from each provider', async () => {
      await task.runSummary()

      expect(jobService.saveAll).toHaveBeenCalledTimes(2)

      expect(jobService.saveAll).toHaveBeenNthCalledWith(1, firstProviderJobs)

      expect(jobService.saveAll).toHaveBeenNthCalledWith(2, secondProviderJobs)
    })

    it('should close the browser of each provider', async () => {
      await task.runSummary()

      expect(firstProvider.closeBrowser).toHaveBeenCalledTimes(1)
      expect(secondProvider.closeBrowser).toHaveBeenCalledTimes(1)
    })

    it('should process providers sequentially', async () => {
      await task.runSummary()

      expect(firstProvider.closeBrowser.mock.invocationCallOrder[0]).toBeLessThan(
        secondProvider.crawlJobs.mock.invocationCallOrder[0],
      )
    })

    it('should save jobs before closing the browser', async () => {
      task = createTask([firstProvider])

      await task.runSummary()

      expect(firstProvider.crawlJobs.mock.invocationCallOrder[0]).toBeLessThan(
        jobService.saveAll.mock.invocationCallOrder[0],
      )

      expect(jobService.saveAll.mock.invocationCallOrder[0]).toBeLessThan(
        firstProvider.closeBrowser.mock.invocationCallOrder[0],
      )
    })

    it('should save an empty array when no jobs are crawled', async () => {
      task = createTask([firstProvider])

      firstProvider.crawlJobs.mockResolvedValue([])

      await task.runSummary()

      expect(jobService.saveAll).toHaveBeenCalledTimes(1)
      expect(jobService.saveAll).toHaveBeenCalledWith([])
      expect(firstProvider.closeBrowser).toHaveBeenCalledTimes(1)
    })

    it('should do nothing when providers are empty', async () => {
      task = createTask([])

      await task.runSummary()

      expect(jobService.saveAll).not.toHaveBeenCalled()
      expect(firstProvider.crawlJobs).not.toHaveBeenCalled()
      expect(secondProvider.crawlJobs).not.toHaveBeenCalled()
    })

    it('should not crawl job details', async () => {
      await task.runSummary()

      expect(firstProvider.crawlJobDetail).not.toHaveBeenCalled()
      expect(secondProvider.crawlJobDetail).not.toHaveBeenCalled()
    })

    it('should close the browser when crawling fails', async () => {
      const error = new Error('Failed to crawl jobs')

      firstProvider.crawlJobs.mockRejectedValue(error)

      await expect(task.runSummary()).rejects.toBe(error)

      expect(firstProvider.closeBrowser).toHaveBeenCalledTimes(1)
      expect(jobService.saveAll).not.toHaveBeenCalled()
    })

    it('should close the browser when saving jobs fails', async () => {
      const error = new Error('Failed to save jobs')

      jobService.saveAll.mockRejectedValue(error)

      await expect(task.runSummary()).rejects.toBe(error)

      expect(firstProvider.crawlJobs).toHaveBeenCalledTimes(1)
      expect(firstProvider.closeBrowser).toHaveBeenCalledTimes(1)
    })

    it('should not process subsequent providers when crawling fails', async () => {
      firstProvider.crawlJobs.mockRejectedValue(new Error('Failed to crawl jobs'))

      await expect(task.runSummary()).rejects.toThrow('Failed to crawl jobs')

      expect(firstProvider.closeBrowser).toHaveBeenCalledTimes(1)

      expect(secondProvider.crawlJobs).not.toHaveBeenCalled()
      expect(secondProvider.closeBrowser).not.toHaveBeenCalled()
    })

    it('should not process subsequent providers when saving fails', async () => {
      jobService.saveAll.mockRejectedValue(new Error('Failed to save jobs'))

      await expect(task.runSummary()).rejects.toThrow('Failed to save jobs')

      expect(firstProvider.closeBrowser).toHaveBeenCalledTimes(1)
      expect(secondProvider.crawlJobs).not.toHaveBeenCalled()
    })

    it('should propagate errors from closeBrowser', async () => {
      const error = new Error('Failed to close browser')

      firstProvider.closeBrowser.mockRejectedValue(error)

      await expect(task.runSummary()).rejects.toBe(error)

      expect(jobService.saveAll).toHaveBeenCalledWith(firstProviderJobs)

      expect(secondProvider.crawlJobs).not.toHaveBeenCalled()
    })
  })

  describe('runDetail', () => {
    it('should crawl job details from all providers', async () => {
      await task.runDetail()

      expect(firstProvider.crawlJobDetail).toHaveBeenCalledTimes(1)
      expect(secondProvider.crawlJobDetail).toHaveBeenCalledTimes(1)
    })

    it('should close the browser of each provider', async () => {
      await task.runDetail()

      expect(firstProvider.closeBrowser).toHaveBeenCalledTimes(1)
      expect(secondProvider.closeBrowser).toHaveBeenCalledTimes(1)
    })

    it('should process providers sequentially', async () => {
      await task.runDetail()

      expect(firstProvider.closeBrowser.mock.invocationCallOrder[0]).toBeLessThan(
        secondProvider.crawlJobDetail.mock.invocationCallOrder[0],
      )
    })

    it('should crawl job details before closing the browser', async () => {
      task = createTask([firstProvider])

      await task.runDetail()

      expect(firstProvider.crawlJobDetail.mock.invocationCallOrder[0]).toBeLessThan(
        firstProvider.closeBrowser.mock.invocationCallOrder[0],
      )
    })

    it('should handle an empty job details array', async () => {
      task = createTask([firstProvider])

      firstProvider.crawlJobDetail.mockResolvedValue([])

      await expect(task.runDetail()).resolves.toBeUndefined()

      expect(firstProvider.closeBrowser).toHaveBeenCalledTimes(1)
    })

    it('should do nothing when providers are empty', async () => {
      task = createTask([])

      await task.runDetail()

      expect(firstProvider.crawlJobDetail).not.toHaveBeenCalled()
      expect(secondProvider.crawlJobDetail).not.toHaveBeenCalled()
      expect(jobService.saveAll).not.toHaveBeenCalled()
    })

    it('should not crawl job summaries', async () => {
      await task.runDetail()

      expect(firstProvider.crawlJobs).not.toHaveBeenCalled()
      expect(secondProvider.crawlJobs).not.toHaveBeenCalled()
    })

    it('should not call saveAll', async () => {
      await task.runDetail()

      expect(jobService.saveAll).not.toHaveBeenCalled()
    })

    it('should close the browser when crawling job details fails', async () => {
      const error = new Error('Failed to crawl job details')

      firstProvider.crawlJobDetail.mockRejectedValue(error)

      await expect(task.runDetail()).rejects.toBe(error)

      expect(firstProvider.closeBrowser).toHaveBeenCalledTimes(1)
    })

    it('should not process subsequent providers when crawling fails', async () => {
      firstProvider.crawlJobDetail.mockRejectedValue(new Error('Failed to crawl job details'))

      await expect(task.runDetail()).rejects.toThrow('Failed to crawl job details')

      expect(firstProvider.closeBrowser).toHaveBeenCalledTimes(1)

      expect(secondProvider.crawlJobDetail).not.toHaveBeenCalled()
      expect(secondProvider.closeBrowser).not.toHaveBeenCalled()
    })

    it('should propagate errors from closeBrowser', async () => {
      const error = new Error('Failed to close browser')

      firstProvider.closeBrowser.mockRejectedValue(error)

      await expect(task.runDetail()).rejects.toBe(error)

      expect(firstProvider.crawlJobDetail).toHaveBeenCalledTimes(1)
      expect(secondProvider.crawlJobDetail).not.toHaveBeenCalled()
    })
  })
})
