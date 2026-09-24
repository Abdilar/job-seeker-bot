import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ICrawledJob } from '../../types'
import type { IJobService } from '../../services'
import type { JobProvider } from '../../crawlers'
import { CrawlJobsTask } from './crawl-jobs.task'

describe('CrawlJobsTask', () => {
  const crawlJobsMock = vi.fn<JobProvider['crawlJobs']>()
  const closeBrowserMock = vi.fn<JobProvider['closeBrowser']>()
  const saveAllMock = vi.fn<IJobService['saveAll']>()

  const provider = {
    crawlJobs: crawlJobsMock,
    closeBrowser: closeBrowserMock,
  } as unknown as JobProvider

  const jobService = {
    saveAll: saveAllMock,
  } as unknown as IJobService

  const task = new CrawlJobsTask(jobService, [provider])

  beforeEach(() => {
    vi.resetAllMocks()
    crawlJobsMock.mockResolvedValue([])
    closeBrowserMock.mockResolvedValue(undefined)
    saveAllMock.mockResolvedValue({
      total: 0,
      saved: 0,
      failed: 0,
    })
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('Successful execution', () => {
    it('crawls and saves jobs', async () => {
      const jobs: ICrawledJob[] = []

      crawlJobsMock.mockResolvedValue(jobs)
      await task.run()

      expect(crawlJobsMock).toHaveBeenCalledOnce()
      expect(saveAllMock).toHaveBeenCalledExactlyOnceWith(jobs)
      expect(closeBrowserMock).toHaveBeenCalledOnce()
    })

    it('closes browser after saving jobs', async () => {
      await task.run()
      const saveOrder = saveAllMock.mock.invocationCallOrder[0]
      const closeOrder = closeBrowserMock.mock.invocationCallOrder[0]

      expect(saveOrder).toBeLessThan(closeOrder)
    })

    it('handles empty jobs', async () => {
      crawlJobsMock.mockResolvedValue([])
      await task.run()

      expect(saveAllMock).toHaveBeenCalledExactlyOnceWith([])
      expect(closeBrowserMock).toHaveBeenCalledOnce()
    })

    it('does nothing when no providers exist', async () => {
      const emptyTask = new CrawlJobsTask(jobService, [])
      await expect(emptyTask.run()).resolves.toBeUndefined()

      expect(crawlJobsMock).not.toHaveBeenCalled()
      expect(saveAllMock).not.toHaveBeenCalled()
    })
  })

  describe('Failed execution', () => {
    it('closes browser when crawling fails', async () => {
      const error = new Error('Crawler failed')
      crawlJobsMock.mockRejectedValue(error)
      await expect(task.run()).rejects.toThrow('Crawler failed')

      expect(saveAllMock).not.toHaveBeenCalled()
      expect(closeBrowserMock).toHaveBeenCalledOnce()
    })

    it('closes browser when saving jobs fails', async () => {
      const error = new Error('Database unavailable')
      saveAllMock.mockRejectedValue(error)

      await expect(task.run()).rejects.toThrow('Database unavailable')
      expect(closeBrowserMock).toHaveBeenCalledOnce()
    })

    it('propagates browser closing errors', async () => {
      closeBrowserMock.mockRejectedValue(new Error('Failed to close browser'))

      await expect(task.run()).rejects.toThrow('Failed to close browser')
    })
  })

  describe('Multiple providers', () => {
    const secondCrawlJobsMock = vi.fn<JobProvider['crawlJobs']>()
    const secondCloseBrowserMock = vi.fn<JobProvider['closeBrowser']>()
    const secondProvider = {
      crawlJobs: secondCrawlJobsMock,
      closeBrowser: secondCloseBrowserMock,
    } as unknown as JobProvider

    const multiProviderTask = new CrawlJobsTask(jobService, [provider, secondProvider])

    beforeEach(() => {
      secondCrawlJobsMock.mockReset()
      secondCloseBrowserMock.mockReset()

      secondCrawlJobsMock.mockResolvedValue([])
      secondCloseBrowserMock.mockResolvedValue(undefined)
    })

    it('executes providers sequentially', async () => {
      await multiProviderTask.run()

      expect(crawlJobsMock).toHaveBeenCalledOnce()
      expect(secondCrawlJobsMock).toHaveBeenCalledOnce()

      const firstCloseOrder = closeBrowserMock.mock.invocationCallOrder[0]
      const secondCrawlOrder = secondCrawlJobsMock.mock.invocationCallOrder[0]

      expect(firstCloseOrder).toBeLessThan(secondCrawlOrder)
    })

    it('stops execution when first provider fails', async () => {
      crawlJobsMock.mockRejectedValue(new Error('First provider failed'))

      await expect(multiProviderTask.run()).rejects.toThrow('First provider failed')
      expect(closeBrowserMock).toHaveBeenCalledOnce()
      expect(secondCrawlJobsMock).not.toHaveBeenCalled()
    })
  })
})
