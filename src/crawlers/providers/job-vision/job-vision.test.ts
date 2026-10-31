import type { Locator, Page } from 'playwright'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ECrawlMode } from '../../../constants'
import type { IJobService } from '../../../services'
import { EProvider, type ICrawledJob } from '../../../types'
import type { JobParser } from '../../parsers'
import {
  JOB_ELEMENT_SELECTOR,
  JOB_VISION_RENDER_TIMEOUT,
  JOB_VISION_URL,
  MAIN_ELEMENT_SELECTOR,
} from './job-vision.constant'
import { JobVisionProduct } from './job-vision.product'
import { JOB_POSTING_TIMEZONE, WAIT_UNTIL } from '../../constants'

const { isRecentMock, randomDelayMock } = vi.hoisted(() => ({
  isRecentMock: vi.fn<(postedAt?: Date, boundary?: Date, timezone?: string) => boolean>(),
  randomDelayMock: vi.fn<(min: number, max: number) => Promise<void>>(),
}))

vi.mock('../../../utilities', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utilities')>()

  return {
    ...actual,
    isRecent: isRecentMock,
    randomDelay: randomDelayMock,
  }
})

describe('JobVisionProduct', () => {
  const boundaryDate = new Date('2026-09-26T10:00:00')
  const recentDate = new Date('2026-09-27T10:00:00')
  const oldDate = new Date('2026-09-25T10:00:00')

  const createJob = (title: string, postedAt?: Date): ICrawledJob =>
    ({
      title,
      url: `https://jobvision.ir/jobs/${encodeURIComponent(title)}`,
      contractType: 'full_time',
      company: {
        fullName: 'Test Company',
      },
      location: {
        country: 'Iran',
      },
      provider: EProvider.JOB_VISION,
      postedAt,
    }) as ICrawledJob

  let gotoMock: ReturnType<typeof vi.fn>
  let addInitScriptMock: ReturnType<typeof vi.fn>
  let waitForMock: ReturnType<typeof vi.fn>
  let pageLocatorMock: ReturnType<typeof vi.fn>
  let parserParseMock: ReturnType<typeof vi.fn>
  let getLatestJobByProviderMock: ReturnType<typeof vi.fn>

  let page: Page
  let parser: JobParser
  let service: IJobService

  beforeEach(() => {
    vi.clearAllMocks()

    isRecentMock.mockImplementation((postedAt) => postedAt?.getTime() === recentDate.getTime())

    randomDelayMock.mockResolvedValue()

    gotoMock = vi.fn().mockResolvedValue(null)
    addInitScriptMock = vi.fn().mockResolvedValue(undefined)
    waitForMock = vi.fn().mockResolvedValue(undefined)
    pageLocatorMock = vi.fn()
    parserParseMock = vi.fn()
    getLatestJobByProviderMock = vi.fn()

    page = {
      goto: gotoMock,
      addInitScript: addInitScriptMock,
      locator: pageLocatorMock,
    } as unknown as Page

    parser = {
      parse: parserParseMock,
    } as unknown as JobParser

    service = {
      getLatestJobByProvider: getLatestJobByProviderMock,
    } as unknown as IJobService
  })

  const createProvider = (mode: ECrawlMode = ECrawlMode.INCREMENTAL): JobVisionProduct =>
    new JobVisionProduct(page, parser, service, mode)

  const mockTotalJobs = (totalJobs?: string) => {
    const element = {
      count: vi.fn().mockResolvedValue(totalJobs ? 1 : 0),
      textContent: vi.fn().mockResolvedValue(totalJobs ?? null),
      first: vi.fn(),
    }

    element.first.mockReturnValue(element)

    return element
  }

  const mockJobElements = (count: number) => ({
    count: vi.fn().mockResolvedValue(count),
    nth: vi.fn().mockImplementation(() => ({}) as Locator),
  })

  const setupPage = (jobCount: number, totalJobs?: string) => {
    const jobElements = mockJobElements(jobCount)

    const mainElement = {
      locator: vi.fn().mockReturnValue(jobElements),
    }

    const firstJobElement = {
      first: vi.fn().mockReturnValue({ waitFor: waitForMock }),
    }

    const totalJobsElement = mockTotalJobs(totalJobs)

    pageLocatorMock.mockImplementation((selector: string) => {
      if (selector === MAIN_ELEMENT_SELECTOR) {
        return mainElement
      }

      if (selector === JOB_ELEMENT_SELECTOR) {
        return firstJobElement
      }

      if (selector === '.seo-title') {
        return totalJobsElement
      }

      return {} as Locator
    })

    return {
      jobElements,
      mainElement,
      totalJobsElement,
    }
  }

  describe('initialize', () => {
    it('should clear cached jobs before navigating to Jobvision', async () => {
      setupPage(1)

      const provider = createProvider()

      await provider.initialize()

      expect(addInitScriptMock).toHaveBeenCalledExactlyOnceWith('sessionStorage.clear()')

      const addInitScriptOrder = addInitScriptMock.mock.invocationCallOrder[0]
      const gotoOrder = gotoMock.mock.invocationCallOrder[0]

      expect(addInitScriptOrder).toBeLessThan(gotoOrder)
    })

    it('should navigate to Jobvision and wait for the job elements', async () => {
      setupPage(1)

      const provider = createProvider()

      await provider.initialize()

      expect(gotoMock).toHaveBeenCalledWith(JOB_VISION_URL, {
        waitUntil: WAIT_UNTIL,
      })

      expect(pageLocatorMock).toHaveBeenCalledWith(MAIN_ELEMENT_SELECTOR)

      expect(waitForMock).toHaveBeenCalledExactlyOnceWith({
        state: 'visible',
        timeout: JOB_VISION_RENDER_TIMEOUT,
      })
    })

    it('should reject the initialization when no job card is rendered', async () => {
      setupPage(1)

      waitForMock.mockRejectedValueOnce(new Error('Timeout 15000ms exceeded'))

      const provider = createProvider()

      await expect(provider.initialize()).rejects.toThrow(
        'Jobvision Provider: Job cards have not been rendered.',
      )
    })

    it('should use page 1 when the total jobs does not contain a number', async () => {
      const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})

      setupPage(1, 'آگهی استخدام')

      parserParseMock.mockResolvedValueOnce(createJob('Only Job', recentDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(1)
      expect(gotoMock).toHaveBeenCalledExactlyOnceWith(JOB_VISION_URL, {
        waitUntil: WAIT_UNTIL,
      })

      expect(consoleErrorMock).toHaveBeenCalledWith(
        "Jobvision Provider: Couldn't count the total jobs: ",
        { totalJobsText: 'آگهی استخدام' },
      )

      consoleErrorMock.mockRestore()
    })

    it('should use page 1 when total jobs does not exist', async () => {
      setupPage(1)

      parserParseMock.mockResolvedValueOnce(createJob('Only Job', recentDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(1)
      expect(randomDelayMock).not.toHaveBeenCalled()
      expect(gotoMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('FULL mode', () => {
    it('should calculate the last page from total jobs in Arabic-Indic digits', async () => {
      setupPage(1, '٦١ آگهی استخدام')

      parserParseMock
        .mockResolvedValueOnce(createJob('Page 1 Job', oldDate))
        .mockResolvedValueOnce(createJob('Page 2 Job', oldDate))
        .mockResolvedValueOnce(createJob('Page 3 Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Page 1 Job', 'Page 2 Job', 'Page 3 Job'])
      expect(gotoMock).toHaveBeenCalledTimes(3)
    })

    it('should crawl all pages and wait for the job elements on every page', async () => {
      setupPage(1, '٦٠ آگهی استخدام')

      parserParseMock
        .mockResolvedValueOnce(createJob('Page 1 Job', oldDate))
        .mockResolvedValueOnce(createJob('Page 2 Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Page 1 Job', 'Page 2 Job'])

      expect(gotoMock).toHaveBeenCalledTimes(2)

      expect(gotoMock).toHaveBeenNthCalledWith(1, JOB_VISION_URL, {
        waitUntil: WAIT_UNTIL,
      })

      expect(gotoMock).toHaveBeenNthCalledWith(2, `${JOB_VISION_URL}&page=2`, {
        waitUntil: WAIT_UNTIL,
      })

      expect(waitForMock).toHaveBeenCalledTimes(2)
      expect(getLatestJobByProviderMock).not.toHaveBeenCalled()
      expect(isRecentMock).not.toHaveBeenCalled()
    })

    it('should calculate the last page from total jobs in Persian digits', async () => {
      setupPage(1, '۶۰ آگهی استخدام')

      parserParseMock
        .mockResolvedValueOnce(createJob('Page 1 Job', oldDate))
        .mockResolvedValueOnce(createJob('Page 2 Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(2)
      expect(gotoMock).toHaveBeenLastCalledWith(`${JOB_VISION_URL}&page=2`, {
        waitUntil: WAIT_UNTIL,
      })
    })

    it('should skip a job when parser cannot parse it', async () => {
      setupPage(2)

      parserParseMock
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(createJob('Valid Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Valid Job'])
    })

    it('should stop crawling when no job elements are found', async () => {
      setupPage(0, '٣٠٠ آگهی استخدام')

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toEqual([])
      expect(randomDelayMock).not.toHaveBeenCalled()

      // NOTE: Only initialize() navigates; an empty first page must not walk further.
      expect(gotoMock).toHaveBeenCalledOnce()
    })
  })

  describe('INCREMENTAL mode', () => {
    beforeEach(() => {
      getLatestJobByProviderMock.mockResolvedValue({
        postedAt: boundaryDate,
      })
    })

    it('should get the latest stored Jobvision job', async () => {
      setupPage(1)

      parserParseMock.mockResolvedValueOnce(createJob('Recent Job', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()
      await provider.getJobs()

      expect(getLatestJobByProviderMock).toHaveBeenCalledExactlyOnceWith(EProvider.JOB_VISION)
    })

    it('should filter out old jobs using the Jobvision timezone', async () => {
      setupPage(2)

      parserParseMock
        .mockResolvedValueOnce(createJob('Recent Job', recentDate))
        .mockResolvedValueOnce(createJob('Old Job', oldDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Recent Job'])

      expect(isRecentMock).toHaveBeenCalledWith(oldDate, boundaryDate, JOB_POSTING_TIMEZONE)
    })

    it('should stop crawling when the last job is not recent', async () => {
      setupPage(2, '٣٠٠ آگهی استخدام')

      parserParseMock
        .mockResolvedValueOnce(createJob('Recent Job', recentDate))
        .mockResolvedValueOnce(createJob('Old Job', oldDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Recent Job'])
      expect(parserParseMock).toHaveBeenCalledTimes(2)
    })

    it('should keep jobs with unknown postedAt', async () => {
      setupPage(2)

      parserParseMock
        .mockResolvedValueOnce(createJob('Unknown Date Job'))
        .mockResolvedValueOnce(createJob('Recent Job', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Unknown Date Job', 'Recent Job'])

      // NOTE: `!item.postedAt` short-circuits `isRecent()`, so the undated job is kept as is.
      expect(isRecentMock).toHaveBeenCalledWith(recentDate, boundaryDate, JOB_POSTING_TIMEZONE)
    })

    it('should use null latest job as the incremental boundary fallback', async () => {
      setupPage(1)

      getLatestJobByProviderMock.mockResolvedValue(null)

      parserParseMock.mockResolvedValueOnce(createJob('Recent Job', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      await provider.getJobs()

      expect(isRecentMock).toHaveBeenCalledWith(recentDate, undefined, JOB_POSTING_TIMEZONE)
    })

    it('should stop fetching after the last page', async () => {
      setupPage(1, '٦٠ آگهی استخدام')

      parserParseMock
        .mockResolvedValueOnce(createJob('Page 1 Job', recentDate))
        .mockResolvedValueOnce(createJob('Page 2 Job', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(2)
      expect(parserParseMock).toHaveBeenCalledTimes(2)
      expect(gotoMock).toHaveBeenCalledTimes(2)
    })

    it('should skip a job when parser cannot parse it', async () => {
      setupPage(2)

      parserParseMock
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(createJob('Valid Job', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Valid Job'])
    })

    it('should stop crawling when no job elements are found', async () => {
      setupPage(0, '٣٠٠ آگهی استخدام')

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toEqual([])
      expect(randomDelayMock).not.toHaveBeenCalled()

      // NOTE: Only initialize() navigates; an empty first page must not walk further.
      expect(gotoMock).toHaveBeenCalledOnce()
    })
  })
})
