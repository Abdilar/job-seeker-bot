import type { Locator, Page } from 'playwright'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ECrawlMode } from '../../../constants'
import type { IJobService } from '../../../services'
import { EProvider, type ICrawledJob } from '../../../types'
import type { JobParser } from '../../parsers'
import { JOB_IN_JA_TIMEZONE, JOB_IN_JA_URL, MAIN_ELEMENT_SELECTOR } from './job-in-ja.constant'
import { JobInJaProduct } from './job-in-ja.product'
import { WAIT_UNTIL } from '../../constants'

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

describe('JobInJaProduct', () => {
  const boundaryDate = new Date('2026-09-26T10:00:00')
  const recentDate = new Date('2026-09-27T10:00:00')
  const oldDate = new Date('2026-09-25T10:00:00')

  const createJob = (title: string, postedAt?: Date): ICrawledJob =>
    ({
      title,
      url: `https://jobinja.ir/jobs/${encodeURIComponent(title)}`,
      contractType: 'full_time',
      company: {
        fullName: 'Test Company',
      },
      location: {
        country: 'Iran',
      },
      provider: EProvider.JOB_IN_JA,
      postedAt,
    }) as ICrawledJob

  let gotoMock: ReturnType<typeof vi.fn>
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
    pageLocatorMock = vi.fn()
    parserParseMock = vi.fn()
    getLatestJobByProviderMock = vi.fn()

    page = {
      goto: gotoMock,
      locator: pageLocatorMock,
    } as unknown as Page

    parser = {
      parse: parserParseMock,
    } as unknown as JobParser

    service = {
      getLatestJobByProvider: getLatestJobByProviderMock,
    } as unknown as IJobService
  })

  const createProvider = (mode: ECrawlMode = ECrawlMode.INCREMENTAL): JobInJaProduct =>
    new JobInJaProduct(page, parser, service, mode)

  const mockPagination = (lastPage?: string) => {
    const paginationLink = {
      textContent: vi.fn().mockResolvedValue(lastPage ?? '1'),
    }

    const paginationItem = {
      locator: vi.fn().mockReturnValue(paginationLink),
    }

    return {
      count: vi.fn().mockResolvedValue(lastPage ? 3 : 0),
      nth: vi.fn().mockReturnValue(paginationItem),
    }
  }

  const mockJobElements = (count: number) => ({
    count: vi.fn().mockResolvedValue(count),
    nth: vi.fn().mockImplementation(() => ({}) as Locator),
  })

  const setupPage = (jobCount: number, lastPage?: string) => {
    const jobElements = mockJobElements(jobCount)

    const mainElement = {
      locator: vi.fn().mockReturnValue(jobElements),
    }

    const paginationElements = mockPagination(lastPage)

    pageLocatorMock.mockImplementation((selector: string) => {
      if (selector === MAIN_ELEMENT_SELECTOR) {
        return mainElement
      }

      if (selector === '#js-jobSearchPaginator ul > li') {
        return paginationElements
      }

      return {} as Locator
    })

    return {
      jobElements,
      mainElement,
      paginationElements,
    }
  }

  describe('initialize', () => {
    it('should navigate to Jobinja and initialize the main element', async () => {
      setupPage(1)

      const provider = createProvider()

      await provider.initialize()

      expect(gotoMock).toHaveBeenCalledWith(JOB_IN_JA_URL, {
        waitUntil: WAIT_UNTIL,
      })

      expect(pageLocatorMock).toHaveBeenCalledWith(MAIN_ELEMENT_SELECTOR)
    })

    it('should detect the last page from pagination', async () => {
      const { paginationElements } = setupPage(1, '۳')

      const provider = createProvider()

      await provider.initialize()

      /*
       * paginationElementsTotal = 3
       * getLastPage() uses nth(total - 2)
       * => nth(1)
       */
      expect(paginationElements.nth).toHaveBeenCalledWith(1)
    })

    it('should use page 1 when pagination does not exist', async () => {
      setupPage(1)

      parserParseMock.mockResolvedValueOnce(createJob('Only Job', recentDate))

      getLatestJobByProviderMock.mockResolvedValue(null)

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(1)
      expect(randomDelayMock).not.toHaveBeenCalled()
      expect(gotoMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('FULL mode', () => {
    it('should return all jobs without filtering by date', async () => {
      setupPage(2)

      parserParseMock
        .mockResolvedValueOnce(createJob('Recent Job', recentDate))
        .mockResolvedValueOnce(createJob('Old Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(2)

      expect(jobs.map((job) => job.title)).toEqual(['Recent Job', 'Old Job'])

      expect(getLatestJobByProviderMock).not.toHaveBeenCalled()
      expect(isRecentMock).not.toHaveBeenCalled()
    })

    it('should crawl all pages', async () => {
      setupPage(1, '۲')

      parserParseMock
        .mockResolvedValueOnce(createJob('Page 1 Job', oldDate))
        .mockResolvedValueOnce(createJob('Page 2 Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Page 1 Job', 'Page 2 Job'])

      expect(randomDelayMock).toHaveBeenCalledOnce()
      expect(randomDelayMock).toHaveBeenCalledWith(1_000, 3_000)

      expect(gotoMock).toHaveBeenCalledTimes(2)

      expect(gotoMock).toHaveBeenNthCalledWith(1, JOB_IN_JA_URL, {
        waitUntil: WAIT_UNTIL,
      })

      expect(gotoMock).toHaveBeenNthCalledWith(2, `${JOB_IN_JA_URL}&page=2`, {
        waitUntil: WAIT_UNTIL,
      })

      expect(getLatestJobByProviderMock).not.toHaveBeenCalled()
      expect(isRecentMock).not.toHaveBeenCalled()
    })

    it('should include old jobs in FULL mode', async () => {
      setupPage(2)

      parserParseMock
        .mockResolvedValueOnce(createJob('Old Job 1', oldDate))
        .mockResolvedValueOnce(createJob('Old Job 2', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Old Job 1', 'Old Job 2'])

      expect(isRecentMock).not.toHaveBeenCalled()
    })

    it('should skip a job when parser cannot parse it', async () => {
      setupPage(2)

      parserParseMock
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(createJob('Valid Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(1)
      expect(jobs[0]?.title).toBe('Valid Job')
    })

    it('should stop crawling when no job elements are found', async () => {
      setupPage(0, '۵')

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toEqual([])
      expect(randomDelayMock).not.toHaveBeenCalled()

      // initialize() navigation only
      expect(gotoMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('INCREMENTAL mode', () => {
    beforeEach(() => {
      getLatestJobByProviderMock.mockResolvedValue({
        postedAt: boundaryDate,
      })
    })

    it('should get the latest stored Jobinja job', async () => {
      setupPage(1)

      parserParseMock.mockResolvedValueOnce(createJob('Recent Job', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()
      await provider.getJobs()

      expect(getLatestJobByProviderMock).toHaveBeenCalledOnce()

      expect(getLatestJobByProviderMock).toHaveBeenCalledWith(EProvider.JOB_IN_JA)
    })

    it('should return recent jobs', async () => {
      setupPage(2)

      parserParseMock
        .mockResolvedValueOnce(createJob('Frontend Developer', recentDate))
        .mockResolvedValueOnce(createJob('Backend Developer', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(2)

      expect(jobs.map((job) => job.title)).toEqual(['Frontend Developer', 'Backend Developer'])

      expect(isRecentMock).toHaveBeenCalledWith(recentDate, boundaryDate, JOB_IN_JA_TIMEZONE)
    })

    it('should filter out old jobs', async () => {
      setupPage(3)

      parserParseMock
        .mockResolvedValueOnce(createJob('Frontend Developer', recentDate))
        .mockResolvedValueOnce(createJob('Backend Developer', recentDate))
        .mockResolvedValueOnce(createJob('Old Developer Job', oldDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(2)

      expect(jobs.map((job) => job.title)).toEqual(['Frontend Developer', 'Backend Developer'])

      expect(isRecentMock).toHaveBeenCalledWith(oldDate, boundaryDate, JOB_IN_JA_TIMEZONE)
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

      /*
       * isRecent() is not called for the unknown job because:
       *
       * !item.postedAt || isRecent(...)
       *
       * short-circuits when postedAt is undefined.
       */
      expect(isRecentMock).toHaveBeenCalledWith(recentDate, boundaryDate, JOB_IN_JA_TIMEZONE)
    })

    it('should use null latest job as the incremental boundary fallback', async () => {
      setupPage(1)

      getLatestJobByProviderMock.mockResolvedValue(null)

      parserParseMock.mockResolvedValueOnce(createJob('Recent Job', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      await provider.getJobs()

      expect(isRecentMock).toHaveBeenCalledWith(recentDate, undefined, JOB_IN_JA_TIMEZONE)
    })

    it('should navigate to the next page when the last job is recent', async () => {
      setupPage(1, '۲')

      parserParseMock
        .mockResolvedValueOnce(createJob('Page 1 Job', recentDate))
        .mockResolvedValueOnce(createJob('Page 2 Job', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Page 1 Job', 'Page 2 Job'])

      /*
       * With the current implementation randomDelay() also runs
       * after processing the last page.
       */
      expect(randomDelayMock).toHaveBeenCalledTimes(2)

      expect(randomDelayMock).toHaveBeenCalledWith(1_000, 3_000)

      /*
       * goNextPage() is called after page 2 too, but internally
       * does not navigate because currentPage === lastPage.
       *
       * Therefore goto() is:
       * 1. initialize()
       * 2. page 2
       */
      expect(gotoMock).toHaveBeenCalledTimes(2)

      expect(gotoMock).toHaveBeenLastCalledWith(`${JOB_IN_JA_URL}&page=2`, {
        waitUntil: WAIT_UNTIL,
      })
    })

    it('should stop fetching after the last page', async () => {
      setupPage(1, '۲')

      parserParseMock
        .mockResolvedValueOnce(createJob('Page 1 Job', recentDate))
        .mockResolvedValueOnce(createJob('Page 2 Job', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(2)

      /*
       * This assertion protects against the previous infinite-loop
       * bug on the last page.
       */
      expect(parserParseMock).toHaveBeenCalledTimes(2)
      expect(gotoMock).toHaveBeenCalledTimes(2)
    })

    it('should stop crawling when the last job is not recent', async () => {
      setupPage(3, '۵')

      parserParseMock
        .mockResolvedValueOnce(createJob('Recent Job 1', recentDate))
        .mockResolvedValueOnce(createJob('Recent Job 2', recentDate))
        .mockResolvedValueOnce(createJob('Old Job', oldDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Recent Job 1', 'Recent Job 2'])

      /*
       * shouldContinue becomes false after page 1.
       * With the current production implementation the delay and
       * navigation happen before the next for-condition check.
       */
      expect(randomDelayMock).toHaveBeenCalledOnce()

      expect(gotoMock).toHaveBeenCalledTimes(2)

      expect(gotoMock).toHaveBeenLastCalledWith(`${JOB_IN_JA_URL}&page=2`, {
        waitUntil: WAIT_UNTIL,
      })

      /*
       * Page 2 is navigated to, but it must never be fetched.
       */
      expect(parserParseMock).toHaveBeenCalledTimes(3)
    })

    it('should stop crawling when all jobs are old', async () => {
      setupPage(2, '۵')

      parserParseMock
        .mockResolvedValueOnce(createJob('Old Job 1', oldDate))
        .mockResolvedValueOnce(createJob('Old Job 2', oldDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toEqual([])

      expect(randomDelayMock).toHaveBeenCalledOnce()

      expect(gotoMock).toHaveBeenCalledTimes(2)

      /*
       * No jobs from page 2 should be parsed.
       */
      expect(parserParseMock).toHaveBeenCalledTimes(2)
    })

    it('should continue crawling when the last job has unknown postedAt', async () => {
      setupPage(1, '۲')

      parserParseMock
        .mockResolvedValueOnce(createJob('Unknown Date Job'))
        .mockResolvedValueOnce(createJob('Recent Job', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Unknown Date Job', 'Recent Job'])

      expect(gotoMock).toHaveBeenCalledWith(`${JOB_IN_JA_URL}&page=2`, {
        waitUntil: WAIT_UNTIL,
      })
    })

    it('should stop crawling when no job elements are found', async () => {
      setupPage(0, '۵')

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toEqual([])

      expect(randomDelayMock).not.toHaveBeenCalled()

      // initialize() navigation only
      expect(gotoMock).toHaveBeenCalledTimes(1)
    })

    it('should skip a job when parser cannot parse it', async () => {
      setupPage(2)

      parserParseMock
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(createJob('Valid Job', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(1)
      expect(jobs[0]?.title).toBe('Valid Job')
    })
  })
})
