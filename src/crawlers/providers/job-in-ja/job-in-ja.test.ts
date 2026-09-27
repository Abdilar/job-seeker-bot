import type { Locator, Page } from 'playwright'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EProvider, type ICrawledJob } from '../../../types'
import type { JobParser } from '../../parsers'
import type { IJobService } from '../../../services'
import { WAIT_UNTIL } from '../../constants'
import { JOB_IN_JA_TIMEZONE, JOB_IN_JA_URL, MAIN_ELEMENT_SELECTOR } from './job-in-ja.constant'
import { JobInJaProduct } from './job-in-ja.product'

const { isRecentMock, randomDelayMock } = vi.hoisted(() => ({
  isRecentMock: vi.fn<(postedAt?: Date, now?: Date) => boolean>(),
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
  const latestStoredDate = new Date('2026-09-26T10:00:00')
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
  let getLatestJobByProviderMock: ReturnType<typeof vi.fn>

  let page: Page
  let parser: JobParser
  let service: IJobService

  beforeEach(() => {
    vi.clearAllMocks()

    isRecentMock.mockImplementation((postedAt, boundary) => {
      if (!postedAt) return false

      const from = new Date(boundary ?? new Date())
      from.setHours(0, 0, 0, 0)

      const date = new Date(postedAt)
      date.setHours(0, 0, 0, 0)

      return date >= from
    })

    randomDelayMock.mockResolvedValue()

    gotoMock = vi.fn().mockResolvedValue(null)
    pageLocatorMock = vi.fn()
    parserParseMock = vi.fn()

    getLatestJobByProviderMock = vi
      .fn()
      .mockResolvedValue(createJob('Latest Stored Job', latestStoredDate))

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

      const provider = new JobInJaProduct(page, parser, service)

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

      const provider = new JobInJaProduct(page, parser, service)

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

      const firstJob = createJob('Frontend Developer', recentDate)
      const secondJob = createJob('Backend Developer', recentDate)

      parserParseMock.mockResolvedValueOnce(firstJob).mockResolvedValueOnce(secondJob)

      const provider = new JobInJaProduct(page, parser, service)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(2)

      expect(jobs.map((job) => job.title)).toEqual(['Frontend Developer', 'Backend Developer'])

      expect(getLatestJobByProviderMock).toHaveBeenCalledOnce()
      expect(getLatestJobByProviderMock).toHaveBeenCalledWith(EProvider.JOB_IN_JA)

      expect(isRecentMock).toHaveBeenCalledWith(
        firstJob.postedAt,
        latestStoredDate,
        JOB_IN_JA_TIMEZONE,
      )

      expect(isRecentMock).toHaveBeenCalledWith(
        secondJob.postedAt,
        latestStoredDate,
        JOB_IN_JA_TIMEZONE,
      )
    })

    it('should use undefined boundary when no stored job exists', async () => {
      getLatestJobByProviderMock.mockResolvedValue(null)

      const jobElements = {
        count: vi.fn().mockResolvedValue(1),
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

      const job = createJob('Frontend Developer', recentDate)

      parserParseMock.mockResolvedValueOnce(job)
      isRecentMock.mockReturnValue(true)

      const provider = new JobInJaProduct(page, parser, service)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(1)

      expect(getLatestJobByProviderMock).toHaveBeenCalledWith(EProvider.JOB_IN_JA)

      expect(isRecentMock).toHaveBeenCalledWith(job.postedAt, undefined, JOB_IN_JA_TIMEZONE)
    })

    it('should filter out jobs older than the latest stored job date', async () => {
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

      const recentJob = createJob('Frontend Developer', recentDate)

      const boundaryJob = createJob('Boundary Job', latestStoredDate)

      const oldJob = createJob('Old Developer Job', oldDate)

      parserParseMock
        .mockResolvedValueOnce(recentJob)
        .mockResolvedValueOnce(boundaryJob)
        .mockResolvedValueOnce(oldJob)

      const provider = new JobInJaProduct(page, parser, service)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Frontend Developer', 'Boundary Job'])

      expect(isRecentMock).toHaveBeenCalledWith(
        recentJob.postedAt,
        latestStoredDate,
        JOB_IN_JA_TIMEZONE,
      )

      expect(isRecentMock).toHaveBeenCalledWith(
        boundaryJob.postedAt,
        latestStoredDate,
        JOB_IN_JA_TIMEZONE,
      )

      expect(isRecentMock).toHaveBeenCalledWith(
        oldJob.postedAt,
        latestStoredDate,
        JOB_IN_JA_TIMEZONE,
      )
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

      const provider = new JobInJaProduct(page, parser, service)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Page 1 Job', 'Page 2 Job'])

      expect(randomDelayMock).toHaveBeenCalledOnce()
      expect(randomDelayMock).toHaveBeenCalledWith(1_000, 3_000)

      expect(gotoMock).toHaveBeenCalledWith(`${JOB_IN_JA_URL}&page=2`, {
        waitUntil: WAIT_UNTIL,
      })
    })

    it('should stop crawling when the last job is older than the boundary', async () => {
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

      const recentJob = createJob('Recent Job', recentDate)

      const boundaryJob = createJob('Boundary Job', latestStoredDate)

      const oldJob = createJob('Old Job', oldDate)

      parserParseMock
        .mockResolvedValueOnce(recentJob)
        .mockResolvedValueOnce(boundaryJob)
        .mockResolvedValueOnce(oldJob)

      const provider = new JobInJaProduct(page, parser, service)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Recent Job', 'Boundary Job'])

      expect(isRecentMock).toHaveBeenCalledWith(
        oldJob.postedAt,
        latestStoredDate,
        JOB_IN_JA_TIMEZONE,
      )

      expect(randomDelayMock).not.toHaveBeenCalled()

      // initialize() only
      expect(gotoMock).toHaveBeenCalledTimes(1)
    })

    it('should stop crawling when all jobs are older than the boundary', async () => {
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

      const provider = new JobInJaProduct(page, parser, service)

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

      const provider = new JobInJaProduct(page, parser, service)

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

      const provider = new JobInJaProduct(page, parser, service)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toEqual([])
      expect(randomDelayMock).not.toHaveBeenCalled()

      // initialize() only
      expect(gotoMock).toHaveBeenCalledTimes(1)
    })
  })
})
