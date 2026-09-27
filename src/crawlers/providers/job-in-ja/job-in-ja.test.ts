import type { Locator, Page } from 'playwright'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ICrawledJob } from '../../../types'
import type { JobParser } from '../../parsers'
import { JOB_IN_JA_URL, MAIN_ELEMENT_SELECTOR } from './job-in-ja.constant'
import { JobInJaProduct } from './job-in-ja.product'
import { WAIT_UNTIL } from '../../constants'

const { isRecentMock, randomDelayMock } = vi.hoisted(() => ({
  isRecentMock: vi.fn<(postedAt: Date) => boolean>(),
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
  const recentDate = new Date('2026-09-27T10:00:00')
  const oldDate = new Date('2026-09-25T10:00:00')

  const createJob = (title: string, postedAt: Date): ICrawledJob =>
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
      provider: 'JOB_IN_JA',
      postedAt,
    }) as ICrawledJob

  let gotoMock: ReturnType<typeof vi.fn>
  let pageLocatorMock: ReturnType<typeof vi.fn>
  let parserParseMock: ReturnType<typeof vi.fn>

  let page: Page
  let parser: JobParser

  beforeEach(() => {
    vi.clearAllMocks()

    isRecentMock.mockImplementation((postedAt) => postedAt.getTime() === recentDate.getTime())

    randomDelayMock.mockResolvedValue()

    gotoMock = vi.fn().mockResolvedValue(null)
    pageLocatorMock = vi.fn()
    parserParseMock = vi.fn()

    page = {
      goto: gotoMock,
      locator: pageLocatorMock,
    } as unknown as Page

    parser = {
      parse: parserParseMock,
    } as unknown as JobParser
  })

  describe('initialize', () => {
    it('should navigate to Jobinja and initialize the main element', async () => {
      const paginationElements = {
        count: vi.fn().mockResolvedValue(0),
      }

      pageLocatorMock.mockImplementation((selector: string) => {
        if (selector === '#js-jobSearchPaginator ul > li') {
          return paginationElements
        }

        return {} as Locator
      })

      const provider = new JobInJaProduct(page, parser)

      await provider.initialize()

      expect(gotoMock).toHaveBeenCalledWith(JOB_IN_JA_URL, {
        waitUntil: WAIT_UNTIL,
      })

      expect(pageLocatorMock).toHaveBeenCalledWith(MAIN_ELEMENT_SELECTOR)
    })

    it('should detect the last page from pagination', async () => {
      const paginationLink = {
        textContent: vi.fn().mockResolvedValue('۳'),
      }

      const paginationItem = {
        locator: vi.fn().mockReturnValue(paginationLink),
      }

      const paginationElements = {
        count: vi.fn().mockResolvedValue(4),
        nth: vi.fn().mockReturnValue(paginationItem),
      }

      pageLocatorMock.mockImplementation((selector: string) => {
        if (selector === '#js-jobSearchPaginator ul > li') {
          return paginationElements
        }

        return {} as Locator
      })

      const provider = new JobInJaProduct(page, parser)

      await provider.initialize()

      expect(paginationElements.nth).toHaveBeenCalledWith(2)
    })
  })

  describe('getJobs', () => {
    it('should return recent jobs', async () => {
      const jobElements = {
        count: vi.fn().mockResolvedValue(2),
        nth: vi.fn().mockImplementation(() => ({}) as Locator),
      }

      const mainElement = {
        locator: vi.fn().mockReturnValue(jobElements),
      }

      const paginationElements = {
        count: vi.fn().mockResolvedValue(0),
      }

      pageLocatorMock.mockImplementation((selector: string) => {
        if (selector === MAIN_ELEMENT_SELECTOR) {
          return mainElement
        }

        return paginationElements
      })

      parserParseMock
        .mockResolvedValueOnce(createJob('Frontend Developer', recentDate))
        .mockResolvedValueOnce(createJob('Backend Developer', recentDate))

      const provider = new JobInJaProduct(page, parser)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(2)

      expect(jobs.map((job) => job.title)).toEqual(['Frontend Developer', 'Backend Developer'])
    })

    it('should filter out old jobs', async () => {
      const jobElements = {
        count: vi.fn().mockResolvedValue(3),
        nth: vi.fn().mockImplementation(() => ({}) as Locator),
      }

      const mainElement = {
        locator: vi.fn().mockReturnValue(jobElements),
      }

      const paginationElements = {
        count: vi.fn().mockResolvedValue(0),
      }

      pageLocatorMock.mockImplementation((selector: string) => {
        if (selector === MAIN_ELEMENT_SELECTOR) {
          return mainElement
        }

        return paginationElements
      })

      parserParseMock
        .mockResolvedValueOnce(createJob('Frontend Developer', recentDate))
        .mockResolvedValueOnce(createJob('Backend Developer', recentDate))
        .mockResolvedValueOnce(createJob('Old Developer Job', oldDate))

      const provider = new JobInJaProduct(page, parser)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(2)

      expect(jobs.map((job) => job.title)).toEqual(['Frontend Developer', 'Backend Developer'])
    })

    it('should navigate to the next page when the last job is recent', async () => {
      const jobElements = {
        count: vi.fn().mockResolvedValue(1),
        nth: vi.fn().mockImplementation(() => ({}) as Locator),
      }

      const mainElement = {
        locator: vi.fn().mockReturnValue(jobElements),
      }

      const paginationLink = {
        textContent: vi.fn().mockResolvedValue('۲'),
      }

      const paginationItem = {
        locator: vi.fn().mockReturnValue(paginationLink),
      }

      const paginationElements = {
        count: vi.fn().mockResolvedValue(3),
        nth: vi.fn().mockReturnValue(paginationItem),
      }

      pageLocatorMock.mockImplementation((selector: string) => {
        if (selector === MAIN_ELEMENT_SELECTOR) {
          return mainElement
        }

        if (selector === '#js-jobSearchPaginator ul > li') {
          return paginationElements
        }

        return {} as Locator
      })

      parserParseMock
        .mockResolvedValueOnce(createJob('Page 1 Job', recentDate))
        .mockResolvedValueOnce(createJob('Page 2 Job', recentDate))

      const provider = new JobInJaProduct(page, parser)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Page 1 Job', 'Page 2 Job'])

      expect(randomDelayMock).toHaveBeenCalledOnce()
      expect(randomDelayMock).toHaveBeenCalledWith(1_000, 3_000)

      expect(gotoMock).toHaveBeenCalledWith(
        `${JOB_IN_JA_URL}&page=2`,
        expect.objectContaining({
          waitUntil: WAIT_UNTIL,
        }),
      )
    })

    it('should stop crawling when the last job is not recent', async () => {
      const jobElements = {
        count: vi.fn().mockResolvedValue(3),
        nth: vi.fn().mockImplementation(() => ({}) as Locator),
      }

      const mainElement = {
        locator: vi.fn().mockReturnValue(jobElements),
      }

      const paginationLink = {
        textContent: vi.fn().mockResolvedValue('۵'),
      }

      const paginationItem = {
        locator: vi.fn().mockReturnValue(paginationLink),
      }

      const paginationElements = {
        count: vi.fn().mockResolvedValue(3),
        nth: vi.fn().mockReturnValue(paginationItem),
      }

      pageLocatorMock.mockImplementation((selector: string) => {
        if (selector === MAIN_ELEMENT_SELECTOR) {
          return mainElement
        }

        if (selector === '#js-jobSearchPaginator ul > li') {
          return paginationElements
        }

        return {} as Locator
      })

      parserParseMock
        .mockResolvedValueOnce(createJob('Recent Job 1', recentDate))
        .mockResolvedValueOnce(createJob('Recent Job 2', recentDate))
        .mockResolvedValueOnce(createJob('Old Job', oldDate))

      const provider = new JobInJaProduct(page, parser)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Recent Job 1', 'Recent Job 2'])

      expect(randomDelayMock).not.toHaveBeenCalled()

      // Only initialize() should navigate.
      expect(gotoMock).toHaveBeenCalledTimes(1)
    })

    it('should stop crawling when all jobs are old', async () => {
      const jobElements = {
        count: vi.fn().mockResolvedValue(2),
        nth: vi.fn().mockImplementation(() => ({}) as Locator),
      }

      const mainElement = {
        locator: vi.fn().mockReturnValue(jobElements),
      }

      const paginationLink = {
        textContent: vi.fn().mockResolvedValue('۵'),
      }

      const paginationItem = {
        locator: vi.fn().mockReturnValue(paginationLink),
      }

      const paginationElements = {
        count: vi.fn().mockResolvedValue(3),
        nth: vi.fn().mockReturnValue(paginationItem),
      }

      pageLocatorMock.mockImplementation((selector: string) => {
        if (selector === MAIN_ELEMENT_SELECTOR) {
          return mainElement
        }

        return paginationElements
      })

      parserParseMock
        .mockResolvedValueOnce(createJob('Old Job 1', oldDate))
        .mockResolvedValueOnce(createJob('Old Job 2', oldDate))

      const provider = new JobInJaProduct(page, parser)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toEqual([])
      expect(randomDelayMock).not.toHaveBeenCalled()
      expect(gotoMock).toHaveBeenCalledTimes(1)
    })

    it('should skip a job when parser cannot parse it', async () => {
      const jobElements = {
        count: vi.fn().mockResolvedValue(2),
        nth: vi.fn().mockImplementation(() => ({}) as Locator),
      }

      const mainElement = {
        locator: vi.fn().mockReturnValue(jobElements),
      }

      const paginationElements = {
        count: vi.fn().mockResolvedValue(0),
      }

      pageLocatorMock.mockImplementation((selector: string) => {
        if (selector === MAIN_ELEMENT_SELECTOR) {
          return mainElement
        }

        return paginationElements
      })

      parserParseMock
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(createJob('Valid Job', recentDate))

      const provider = new JobInJaProduct(page, parser)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(1)
      expect(jobs[0]?.title).toBe('Valid Job')
    })

    it('should stop crawling when no job elements are found', async () => {
      const jobElements = {
        count: vi.fn().mockResolvedValue(0),
      }

      const mainElement = {
        locator: vi.fn().mockReturnValue(jobElements),
      }

      const paginationLink = {
        textContent: vi.fn().mockResolvedValue('۵'),
      }

      const paginationItem = {
        locator: vi.fn().mockReturnValue(paginationLink),
      }

      const paginationElements = {
        count: vi.fn().mockResolvedValue(3),
        nth: vi.fn().mockReturnValue(paginationItem),
      }

      pageLocatorMock.mockImplementation((selector: string) => {
        if (selector === MAIN_ELEMENT_SELECTOR) {
          return mainElement
        }

        return paginationElements
      })

      const provider = new JobInJaProduct(page, parser)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toEqual([])
      expect(randomDelayMock).not.toHaveBeenCalled()

      // initialize only — it must not continue to page 2.
      expect(gotoMock).toHaveBeenCalledTimes(1)
    })
  })
})
