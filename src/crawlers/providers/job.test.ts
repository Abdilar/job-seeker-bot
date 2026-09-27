import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Browser, BrowserContext, Page } from 'playwright'

import type { ICrawledJob } from '../../types'
import type { IJobProvider } from './job.model'

import { JobProvider } from './job.provider'

const { launchMock } = vi.hoisted(() => ({
  launchMock: vi.fn(),
}))

vi.mock('playwright', () => ({
  chromium: {
    launch: launchMock,
  },
}))

describe('JobProvider', () => {
  const newPageMock = vi.fn<BrowserContext['newPage']>()
  const newContextMock = vi.fn<Browser['newContext']>()
  const closeMock = vi.fn<Browser['close']>()
  const getJobsMock = vi.fn<IJobProvider['getJobs']>()

  const pageMock = {} as Page

  const browserContextMock = {
    newPage: newPageMock,
  } as unknown as BrowserContext

  const browserMock = {
    newContext: newContextMock,
    close: closeMock,
  } as unknown as Browser

  const providerMock = {
    getJobs: getJobsMock,
  } as unknown as IJobProvider

  class TestJobProvider extends JobProvider {
    readonly createProviderMock = vi.fn<(page: Page) => Promise<IJobProvider>>()

    protected createProvider(page: Page): Promise<IJobProvider> {
      return this.createProviderMock(page)
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    launchMock.mockResolvedValue(browserMock)
    newContextMock.mockResolvedValue(browserContextMock)
    newPageMock.mockResolvedValue(pageMock)
    getJobsMock.mockResolvedValue([])
  })

  it('launches browser and crawls jobs', async () => {
    const jobs: ICrawledJob[] = []

    getJobsMock.mockResolvedValue(jobs)

    const jobProvider = new TestJobProvider()
    jobProvider.createProviderMock.mockResolvedValue(providerMock)

    const result = await jobProvider.crawlJobs()

    expect(launchMock).toHaveBeenCalledWith({
      headless: false,
    })

    expect(newContextMock).toHaveBeenCalledWith({
      ignoreHTTPSErrors: true,
    })

    expect(newPageMock).toHaveBeenCalledOnce()
    expect(jobProvider.createProviderMock).toHaveBeenCalledWith(pageMock)
    expect(getJobsMock).toHaveBeenCalledOnce()

    expect(result).toBe(jobs)
  })

  it('launches browser in headless mode in production', async () => {
    const previousNodeEnv = process.env.NODE_ENV

    process.env.NODE_ENV = 'production'

    try {
      const jobProvider = new TestJobProvider()
      jobProvider.createProviderMock.mockResolvedValue(providerMock)

      await jobProvider.crawlJobs()

      expect(launchMock).toHaveBeenCalledWith({
        headless: true,
      })
    } finally {
      process.env.NODE_ENV = previousNodeEnv
    }
  })

  it('closes browser after it has been launched', async () => {
    const jobProvider = new TestJobProvider()
    jobProvider.createProviderMock.mockResolvedValue(providerMock)

    await jobProvider.crawlJobs()
    await jobProvider.closeBrowser()

    expect(closeMock).toHaveBeenCalledOnce()
  })

  it('does nothing when browser has not been launched', async () => {
    const jobProvider = new TestJobProvider()

    await expect(jobProvider.closeBrowser()).resolves.toBeUndefined()

    expect(closeMock).not.toHaveBeenCalled()
  })
})
