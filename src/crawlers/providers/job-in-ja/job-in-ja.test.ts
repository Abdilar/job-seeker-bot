import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Locator, Page } from 'playwright'

import type { ICrawledJob, ICrawledJobDetail, IExtractedJob, IJob } from '../../../types'

import { EContractType, EProvider, EWorkMode, EVisaSponsorship } from '../../../types'

import { ECrawlMode, TEHRAN_TIMEZONE } from '../../../constants'

import { WAIT_UNTIL } from '../../constants'

import { JOB_IN_JA_URL, SUMMERY_ELEMENT_SELECTOR } from './job-in-ja.constant'

import { DETAIL_ELEMENT_SELECTOR } from '../../parsers/job-in-ja/job-in-ja.constant'

import type { JobParser } from '../../parsers'
import type { IJobService } from '../../../services'

import { JobInJaProduct } from './job-in-ja.product'

// --------------------------------------------------
// Module Mocks
// --------------------------------------------------

const { randomDelayMock, isRecentMock, extractJobDetailMock } = vi.hoisted(() => ({
  randomDelayMock: vi.fn(),
  isRecentMock: vi.fn(),
  extractJobDetailMock: vi.fn(),
}))

vi.mock('../../../utilities', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utilities')>()

  return {
    ...actual,
    randomDelay: randomDelayMock,
    isRecent: isRecentMock,
  }
})

vi.mock('../../../api', () => ({
  JobExtractionApi: class {},
}))

vi.mock('../../../services', () => ({
  JobExtractionService: class {
    extractJobDetail = extractJobDetailMock
  },
}))

// --------------------------------------------------
// Locator Mock
// --------------------------------------------------

interface LocatorMockOptions {
  count?: number
  text?: string | null
  innerText?: string
  items?: Locator[]
  children?: Record<string, Locator>
}

const createLocator = ({
  count,
  text = null,
  innerText = '',
  items = [],
  children = {},
}: LocatorMockOptions = {}): Locator => {
  const locator = {
    count: vi.fn<Locator['count']>().mockResolvedValue(count ?? items.length),

    textContent: vi.fn<Locator['textContent']>().mockResolvedValue(text),

    innerText: vi.fn<Locator['innerText']>().mockResolvedValue(innerText),

    waitFor: vi.fn<Locator['waitFor']>().mockResolvedValue(undefined),

    nth: vi.fn((index: number): Locator => {
      const item = items[index]

      if (!item) {
        throw new Error(`Locator index not found: ${index}`)
      }

      return item
    }),

    locator: vi.fn((selector: string): Locator => {
      const child = children[selector]

      if (!child) {
        throw new Error(`Locator not found: ${selector}`)
      }

      return child
    }),
  }

  return locator as unknown as Locator
}

// --------------------------------------------------
// Summary Fixture
// --------------------------------------------------

const createSummaryElement = (count: number): Locator => {
  const items = Array.from({ length: count }, () => createLocator())

  return createLocator({
    children: {
      '.c-jobListView__item': createLocator({
        items,
      }),
    },
  })
}

// --------------------------------------------------
// Pagination Fixture
// --------------------------------------------------

const PAGINATION_SELECTOR = '#js-jobSearchPaginator ul > li'

const createPaginationElement = (lastPage: string | null = '۱'): Locator => {
  return createLocator({
    items: [
      createLocator(),

      createLocator({
        children: {
          a: createLocator({
            text: lastPage,
          }),
        },
      }),

      createLocator(),
    ],
  })
}

// --------------------------------------------------
// Job Fixtures
// --------------------------------------------------

const createCrawledJob = (overrides: Partial<ICrawledJob> = {}): ICrawledJob => ({
  title: 'Frontend Developer',
  url: 'https://jobinja.ir/jobs/1',
  provider: EProvider.JOB_IN_JA,
  contractType: EContractType.FULL_TIME,
  postedAt: new Date('2026-01-10T10:00:00Z'),

  company: {
    fullName: 'Example Company',
  },

  location: {
    country: 'ایران',
    province: 'تهران',
  },

  ...overrides,
})

const createJob = (overrides: Partial<IJob> = {}): IJob => ({
  ...createCrawledJob(),

  id: 'job-1',
  createdAt: new Date('2026-01-10T10:00:00Z'),
  updatedAt: new Date('2026-01-10T10:00:00Z'),

  detail: undefined,

  ...overrides,
})

const createJobs = (count: number): IJob[] =>
  Array.from({ length: count }, (_, index) =>
    createJob({
      id: `job-${index + 1}`,
      url: `https://jobinja.ir/jobs/${index + 1}`,
    }),
  )

const createCrawledJobDetail = (overrides: Partial<ICrawledJobDetail> = {}): ICrawledJobDetail => ({
  category: 'Software Engineering',
  salary: '30000000',
  skills: ['JavaScript'],
  workMode: EWorkMode.ONSITE,
  applicationUrl: 'https://jobinja.ir/jobs/1',

  experience: {
    raw: '۳ تا ۵ سال',
    minYears: 3,
    maxYears: 5,
  },

  ...overrides,
})

const createExtractedJob = (overrides: Partial<IExtractedJob> = {}): IExtractedJob =>
  ({
    description: 'Frontend developer job description',

    skills: ['React', 'TypeScript'],

    responsibilities: ['Develop user interfaces'],

    requirements: ['Experience with React'],

    preferredQualifications: ['Experience with Next.js'],

    benefits: ['Health insurance'],

    workMode: EWorkMode.REMOTE,
    visaSponsorship: EVisaSponsorship.AVAILABLE,

    ...overrides,
  }) as IExtractedJob

// --------------------------------------------------
// Tests
// --------------------------------------------------

describe('JobInJaProduct', () => {
  let provider: JobInJaProduct

  const page = {
    goto: vi.fn<Page['goto']>(),
    locator: vi.fn<Page['locator']>(),
    url: vi.fn<Page['url']>(),
  }

  const parser = {
    parseSummary: vi.fn<JobParser['parseSummary']>(),
    parseDetail: vi.fn<JobParser['parseDetail']>(),
  }

  const service = {
    getLatestJobByProvider: vi.fn<IJobService['getLatestJobByProvider']>(),

    getJobsWithoutDetail: vi.fn<IJobService['getJobsWithoutDetail']>(),

    saveJobDetail: vi.fn<IJobService['saveJobDetail']>(),
  }

  const createProvider = (mode: ECrawlMode = ECrawlMode.FULL): JobInJaProduct => {
    return new JobInJaProduct(
      page as unknown as Page,
      parser as unknown as JobParser,
      service as unknown as IJobService,
      mode,
    )
  }

  const setupSummaryPages = (pageJobCounts: number[], paginationElement?: Locator): void => {
    const summaryElements = pageJobCounts.map(createSummaryElement)

    const pagination = paginationElement ?? createPaginationElement(String(pageJobCounts.length))

    page.locator.mockImplementation((selector: string): Locator => {
      if (selector === SUMMERY_ELEMENT_SELECTOR) {
        const element = summaryElements.shift()

        if (!element) {
          throw new Error('Summary element not found')
        }

        return element
      }

      if (selector === PAGINATION_SELECTOR) {
        return pagination
      }

      throw new Error(`Unexpected selector: ${selector}`)
    })
  }

  const setupDetailElement = (
    element: Locator = createLocator({
      count: 1,
      innerText: 'Job description content',
    }),
  ): Locator => {
    page.locator.mockImplementation((selector: string): Locator => {
      if (selector === DETAIL_ELEMENT_SELECTOR) {
        return element
      }

      throw new Error(`Unexpected selector: ${selector}`)
    })

    return element
  }

  beforeEach(() => {
    vi.resetAllMocks()

    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    page.goto.mockResolvedValue(null)

    page.url.mockReturnValue('https://jobinja.ir/jobs/1')

    randomDelayMock.mockResolvedValue(undefined)

    isRecentMock.mockReturnValue(true)

    parser.parseSummary.mockResolvedValue(createCrawledJob())

    parser.parseDetail.mockResolvedValue(createCrawledJobDetail())

    service.getLatestJobByProvider.mockResolvedValue(null)

    service.getJobsWithoutDetail.mockResolvedValue([])

    service.saveJobDetail.mockResolvedValue(createJob())

    extractJobDetailMock.mockResolvedValue(createExtractedJob())

    provider = createProvider()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ------------------------------------------------
  // initializeSummery
  // ------------------------------------------------

  describe('initializeSummery', () => {
    it('should navigate to the Jobinja website', async () => {
      setupSummaryPages([1])

      await provider.initializeSummery()

      expect(page.goto).toHaveBeenCalledTimes(1)

      expect(page.goto).toHaveBeenCalledWith(JOB_IN_JA_URL, {
        waitUntil: WAIT_UNTIL,
      })
    })

    it('should locate the main summary element', async () => {
      setupSummaryPages([1])

      await provider.initializeSummery()

      expect(page.locator).toHaveBeenCalledWith(SUMMERY_ELEMENT_SELECTOR)
    })

    it('should locate the pagination elements', async () => {
      setupSummaryPages([1])

      await provider.initializeSummery()

      expect(page.locator).toHaveBeenCalledWith(PAGINATION_SELECTOR)
    })

    it('should use one page when pagination does not exist', async () => {
      setupSummaryPages([2], createLocator({ count: 0 }))

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toHaveLength(2)
      expect(page.goto).toHaveBeenCalledTimes(1)
    })

    it.each(['۲', '2'])('should convert pagination value "%s"', async (lastPage) => {
      setupSummaryPages([1, 1], createPaginationElement(lastPage))

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toHaveLength(2)
      expect(page.goto).toHaveBeenCalledTimes(2)
    })

    it.each([null, '', 'invalid', '۰'])(
      'should use one page for invalid pagination value "%s"',
      async (lastPage) => {
        setupSummaryPages([1], createPaginationElement(lastPage))

        await provider.initializeSummery()

        const result = await provider.getJobs()

        expect(result).toHaveLength(1)
        expect(page.goto).toHaveBeenCalledTimes(1)
      },
    )

    it('should propagate navigation errors', async () => {
      const error = new Error('Navigation failed')

      page.goto.mockRejectedValueOnce(error)

      await expect(provider.initializeSummery()).rejects.toBe(error)
    })

    it('should propagate pagination errors', async () => {
      const pagination = createLocator()

      const error = new Error('Pagination count failed')

      vi.spyOn(pagination, 'count').mockRejectedValueOnce(error)

      setupSummaryPages([1], pagination)

      await expect(provider.initializeSummery()).rejects.toBe(error)
    })
  })

  // ------------------------------------------------
  // getJobs - FULL
  // ------------------------------------------------

  describe('getJobs - FULL mode', () => {
    it('should fetch all jobs from a single page', async () => {
      const firstJob = createCrawledJob({
        url: 'https://jobinja.ir/jobs/1',
      })

      const secondJob = createCrawledJob({
        url: 'https://jobinja.ir/jobs/2',
      })

      setupSummaryPages([2])

      parser.parseSummary.mockResolvedValueOnce(firstJob).mockResolvedValueOnce(secondJob)

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toEqual([firstJob, secondJob])

      expect(parser.parseSummary).toHaveBeenCalledTimes(2)
    })

    it('should fetch jobs from all available pages', async () => {
      setupSummaryPages([2, 3, 1])

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toHaveLength(6)

      expect(parser.parseSummary).toHaveBeenCalledTimes(6)

      expect(page.goto).toHaveBeenCalledTimes(3)
    })

    it('should navigate to the correct pagination URLs', async () => {
      setupSummaryPages([1, 1, 1])

      await provider.initializeSummery()
      await provider.getJobs()

      expect(page.goto).toHaveBeenNthCalledWith(1, JOB_IN_JA_URL, { waitUntil: WAIT_UNTIL })

      expect(page.goto).toHaveBeenNthCalledWith(2, `${JOB_IN_JA_URL}&page=2`, {
        waitUntil: WAIT_UNTIL,
      })

      expect(page.goto).toHaveBeenNthCalledWith(3, `${JOB_IN_JA_URL}&page=3`, {
        waitUntil: WAIT_UNTIL,
      })
    })

    it('should delay between pages', async () => {
      setupSummaryPages([1, 1, 1])

      await provider.initializeSummery()
      await provider.getJobs()

      expect(randomDelayMock).toHaveBeenCalledTimes(2)

      expect(randomDelayMock).toHaveBeenCalledWith(1_000, 3_000)
    })

    it('should not delay after the last page', async () => {
      setupSummaryPages([1])

      await provider.initializeSummery()
      await provider.getJobs()

      expect(randomDelayMock).not.toHaveBeenCalled()
    })

    it('should not fetch the latest saved job', async () => {
      setupSummaryPages([1])

      await provider.initializeSummery()
      await provider.getJobs()

      expect(service.getLatestJobByProvider).not.toHaveBeenCalled()
    })

    it('should not filter jobs by publication date', async () => {
      setupSummaryPages([2])

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toHaveLength(2)
      expect(isRecentMock).not.toHaveBeenCalled()
    })

    it('should skip jobs that cannot be parsed', async () => {
      const validJob = createCrawledJob()

      setupSummaryPages([3])

      parser.parseSummary
        .mockResolvedValueOnce(validJob)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(validJob)

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toEqual([validJob, validJob])

      expect(parser.parseSummary).toHaveBeenCalledTimes(3)
    })

    it('should return an empty array when all jobs fail parsing', async () => {
      setupSummaryPages([3])

      parser.parseSummary.mockResolvedValue(undefined)

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toEqual([])
    })

    it('should return an empty array when no job elements exist', async () => {
      setupSummaryPages([0])

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toEqual([])

      expect(parser.parseSummary).not.toHaveBeenCalled()
    })

    it('should return an empty array before initialization', async () => {
      const result = await provider.getJobs()

      expect(result).toEqual([])

      expect(parser.parseSummary).not.toHaveBeenCalled()
    })

    it('should preserve jobs fetched before a navigation failure', async () => {
      setupSummaryPages([2, 2])

      page.goto
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Second page navigation failed'))

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toHaveLength(2)

      expect(parser.parseSummary).toHaveBeenCalledTimes(2)
    })

    it('should stop crawling when random delay fails', async () => {
      setupSummaryPages([2, 2])

      randomDelayMock.mockRejectedValueOnce(new Error('Delay failed'))

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toHaveLength(2)
      expect(page.goto).toHaveBeenCalledTimes(1)
    })

    it('should stop crawling when the parser throws an error', async () => {
      setupSummaryPages([2, 2])

      parser.parseSummary.mockRejectedValueOnce(new Error('Parser failed'))

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toEqual([])
      expect(page.goto).toHaveBeenCalledTimes(1)
    })
  })

  // ------------------------------------------------
  // getJobs - INCREMENTAL
  // ------------------------------------------------

  describe('getJobs - INCREMENTAL mode', () => {
    beforeEach(() => {
      provider = createProvider(ECrawlMode.INCREMENTAL)
    })

    it('should fetch the latest saved Jobinja job', async () => {
      setupSummaryPages([1])

      await provider.initializeSummery()
      await provider.getJobs()

      expect(service.getLatestJobByProvider).toHaveBeenCalledTimes(1)

      expect(service.getLatestJobByProvider).toHaveBeenCalledWith(EProvider.JOB_IN_JA)
    })

    it('should fetch all jobs when no latest job exists', async () => {
      setupSummaryPages([2, 2])

      service.getLatestJobByProvider.mockResolvedValue(null)

      isRecentMock.mockReturnValue(true)

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toHaveLength(4)
    })

    it('should compare job dates using Tehran timezone', async () => {
      const latestJob = createJob({
        postedAt: new Date('2026-01-09T10:00:00Z'),
      })

      const crawledJob = createCrawledJob({
        postedAt: new Date('2026-01-10T10:00:00Z'),
      })

      setupSummaryPages([1])

      service.getLatestJobByProvider.mockResolvedValue(latestJob)

      parser.parseSummary.mockResolvedValue(crawledJob)

      await provider.initializeSummery()
      await provider.getJobs()

      expect(isRecentMock).toHaveBeenCalledWith(
        crawledJob.postedAt,
        latestJob.postedAt,
        TEHRAN_TIMEZONE,
      )
    })

    it('should pass undefined when no latest publication date exists', async () => {
      const job = createCrawledJob()

      setupSummaryPages([1])

      parser.parseSummary.mockResolvedValue(job)

      await provider.initializeSummery()
      await provider.getJobs()

      expect(isRecentMock).toHaveBeenCalledWith(job.postedAt, undefined, TEHRAN_TIMEZONE)
    })

    it('should return only recent jobs', async () => {
      const latestJob = createJob({
        postedAt: new Date('2026-01-09T10:00:00Z'),
      })

      const recentJob = createCrawledJob({
        url: 'https://jobinja.ir/jobs/recent',
        postedAt: new Date('2026-01-10T10:00:00Z'),
      })

      const oldJob = createCrawledJob({
        url: 'https://jobinja.ir/jobs/old',
        postedAt: new Date('2026-01-01T10:00:00Z'),
      })

      setupSummaryPages([2])

      service.getLatestJobByProvider.mockResolvedValue(latestJob)

      parser.parseSummary.mockResolvedValueOnce(recentJob).mockResolvedValueOnce(oldJob)

      isRecentMock.mockImplementation(
        (postedAt: Date) => postedAt.getTime() >= new Date('2026-01-09T10:00:00Z').getTime(),
      )

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toEqual([recentJob])
    })

    it('should exclude all old jobs', async () => {
      setupSummaryPages([3])

      isRecentMock.mockReturnValue(false)

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toEqual([])
    })

    it('should include jobs without a publication date', async () => {
      const job = createCrawledJob()

      delete job.postedAt

      setupSummaryPages([1])

      parser.parseSummary.mockResolvedValue(job)

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toEqual([job])
      expect(isRecentMock).not.toHaveBeenCalled()
    })

    it('should continue crawling while the last job is recent', async () => {
      setupSummaryPages([1, 1, 1])

      isRecentMock.mockReturnValue(true)

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toHaveLength(3)

      expect(parser.parseSummary).toHaveBeenCalledTimes(3)
    })

    it('should stop fetching jobs when the last job is old', async () => {
      setupSummaryPages([1, 1, 1])

      isRecentMock.mockReturnValue(false)

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toEqual([])

      expect(parser.parseSummary).toHaveBeenCalledTimes(1)
    })

    it('should continue crawling when the last job has no date', async () => {
      const job = createCrawledJob()

      delete job.postedAt

      setupSummaryPages([1, 1])

      parser.parseSummary.mockResolvedValue(job)

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toHaveLength(2)
      expect(isRecentMock).not.toHaveBeenCalled()
    })

    it('should stop when all jobs on a page fail parsing', async () => {
      setupSummaryPages([2, 2])

      parser.parseSummary.mockResolvedValue(undefined)

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toEqual([])

      expect(parser.parseSummary).toHaveBeenCalledTimes(2)
    })

    it('should stop when no job elements exist', async () => {
      setupSummaryPages([0, 2])

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toEqual([])
      expect(page.goto).toHaveBeenCalledTimes(1)
    })

    it('should preserve recent jobs before a navigation failure', async () => {
      setupSummaryPages([2, 2])

      page.goto.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('Navigation failed'))

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toHaveLength(2)
    })

    it('should propagate latest job service errors', async () => {
      const error = new Error('Database error')

      service.getLatestJobByProvider.mockRejectedValueOnce(error)

      await expect(provider.getJobs()).rejects.toBe(error)

      expect(parser.parseSummary).not.toHaveBeenCalled()
    })

    it('should handle errors during date filtering', async () => {
      setupSummaryPages([2, 2])

      isRecentMock.mockImplementationOnce(() => {
        throw new Error('Date comparison failed')
      })

      await provider.initializeSummery()

      const result = await provider.getJobs()

      expect(result).toEqual([])
      expect(page.goto).toHaveBeenCalledTimes(1)
    })
  })

  // ------------------------------------------------
  // getJobsByCount
  // ------------------------------------------------

  describe('getJobsByCount', () => {
    it.each([1, 2, 3, 5])('should fetch exactly %i jobs', async (count) => {
      setupSummaryPages([5])

      await provider.initializeSummery()

      const result = await provider.getJobsByCount(count)

      expect(result).toHaveLength(count)

      expect(parser.parseSummary).toHaveBeenCalledTimes(count)
    })

    it('should not navigate to another page', async () => {
      setupSummaryPages([5, 5])

      await provider.initializeSummery()
      await provider.getJobsByCount(2)

      expect(page.goto).toHaveBeenCalledTimes(1)
    })

    it('should not apply a random delay', async () => {
      setupSummaryPages([5])

      await provider.initializeSummery()
      await provider.getJobsByCount(2)

      expect(randomDelayMock).not.toHaveBeenCalled()
    })

    it('should skip jobs that cannot be parsed', async () => {
      const job = createCrawledJob()

      setupSummaryPages([3])

      parser.parseSummary
        .mockResolvedValueOnce(job)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(job)

      await provider.initializeSummery()

      const result = await provider.getJobsByCount(3)

      expect(result).toEqual([job, job])
    })

    it('should return an empty array when all requested jobs fail parsing', async () => {
      setupSummaryPages([3])

      parser.parseSummary.mockResolvedValue(undefined)

      await provider.initializeSummery()

      const result = await provider.getJobsByCount(3)

      expect(result).toEqual([])
    })

    it('should throw an error before initialization', async () => {
      await expect(provider.getJobsByCount(1)).rejects.toThrow('mainElement is required')
    })

    it('should throw an error when count is zero', async () => {
      setupSummaryPages([3])

      await provider.initializeSummery()

      await expect(provider.getJobsByCount(0)).rejects.toThrow('No job elements found.')

      expect(parser.parseSummary).not.toHaveBeenCalled()
    })

    it('should propagate parser errors', async () => {
      const error = new Error('Parser failed')

      setupSummaryPages([1])

      parser.parseSummary.mockRejectedValueOnce(error)

      await provider.initializeSummery()

      await expect(provider.getJobsByCount(1)).rejects.toBe(error)
    })

    it('should pass the correct locator to the parser', async () => {
      const firstJobElement = createLocator()
      const secondJobElement = createLocator()

      const summaryElement = createLocator({
        children: {
          '.c-jobListView__item': createLocator({
            items: [firstJobElement, secondJobElement],
          }),
        },
      })

      page.locator
        .mockReturnValueOnce(summaryElement)
        .mockReturnValueOnce(createPaginationElement('۱'))

      await provider.initializeSummery()
      await provider.getJobsByCount(2)

      expect(parser.parseSummary).toHaveBeenNthCalledWith(1, firstJobElement)

      expect(parser.parseSummary).toHaveBeenNthCalledWith(2, secondJobElement)
    })
  })

  // ------------------------------------------------
  // getJobsWithoutDetail
  // ------------------------------------------------

  describe('getJobsWithoutDetail', () => {
    it('should fetch Jobinja jobs without details', async () => {
      await provider.getJobsWithoutDetail()

      expect(service.getJobsWithoutDetail).toHaveBeenCalledTimes(1)

      expect(service.getJobsWithoutDetail).toHaveBeenCalledWith(EProvider.JOB_IN_JA)
    })

    it('should return the original jobs without details', async () => {
      const jobs = createJobs(4)

      setupDetailElement()

      service.getJobsWithoutDetail.mockResolvedValue(jobs)

      const result = await provider.getJobsWithoutDetail()

      expect(result).toBe(jobs)
    })

    it('should process four jobs', async () => {
      const jobs = createJobs(4)

      setupDetailElement()

      service.getJobsWithoutDetail.mockResolvedValue(jobs)

      await provider.getJobsWithoutDetail()

      expect(page.goto).toHaveBeenCalledTimes(4)

      expect(parser.parseDetail).toHaveBeenCalledTimes(4)

      expect(extractJobDetailMock).toHaveBeenCalledTimes(4)

      expect(service.saveJobDetail).toHaveBeenCalledTimes(4)
    })

    it('should process only the first four jobs', async () => {
      const jobs = createJobs(6)

      setupDetailElement()

      service.getJobsWithoutDetail.mockResolvedValue(jobs)

      const result = await provider.getJobsWithoutDetail()

      expect(result).toHaveLength(6)

      expect(page.goto).toHaveBeenCalledTimes(4)

      expect(service.saveJobDetail).toHaveBeenCalledTimes(4)
    })

    it('should handle fewer than four jobs', async () => {
      const jobs = createJobs(2)

      setupDetailElement()

      service.getJobsWithoutDetail.mockResolvedValue(jobs)

      const result = await provider.getJobsWithoutDetail()

      expect(result).toEqual(jobs)

      expect(service.saveJobDetail).toHaveBeenCalledTimes(2)
    })

    it('should return an empty array when no jobs exist', async () => {
      service.getJobsWithoutDetail.mockResolvedValue([])

      const result = await provider.getJobsWithoutDetail()

      expect(result).toEqual([])

      expect(page.goto).not.toHaveBeenCalled()

      expect(parser.parseDetail).not.toHaveBeenCalled()

      expect(extractJobDetailMock).not.toHaveBeenCalled()

      expect(service.saveJobDetail).not.toHaveBeenCalled()
    })

    it('should navigate to each job URL', async () => {
      const jobs = createJobs(4)

      setupDetailElement()

      service.getJobsWithoutDetail.mockResolvedValue(jobs)

      await provider.getJobsWithoutDetail()

      jobs.forEach((job, index) => {
        expect(page.goto).toHaveBeenNthCalledWith(index + 1, job.url, { waitUntil: WAIT_UNTIL })
      })
    })

    it('should locate the job detail element', async () => {
      setupDetailElement()

      service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

      await provider.getJobsWithoutDetail()

      expect(page.locator).toHaveBeenCalledWith(DETAIL_ELEMENT_SELECTOR)
    })

    it('should wait for the detail element to be attached', async () => {
      const element = setupDetailElement()

      const waitForSpy = vi.spyOn(element, 'waitFor')

      service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

      await provider.getJobsWithoutDetail()

      expect(waitForSpy).toHaveBeenCalledTimes(4)

      expect(waitForSpy).toHaveBeenCalledWith({
        state: 'attached',
      })
    })

    it('should extract the job description from the DOM', async () => {
      const element = setupDetailElement()

      const innerTextSpy = vi.spyOn(element, 'innerText')

      service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

      await provider.getJobsWithoutDetail()

      expect(innerTextSpy).toHaveBeenCalledTimes(4)
    })

    it('should pass the job description to the extraction service', async () => {
      const description = 'Senior Frontend Developer with React experience'

      setupDetailElement(
        createLocator({
          count: 1,
          innerText: description,
        }),
      )

      service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

      await provider.getJobsWithoutDetail()

      expect(extractJobDetailMock).toHaveBeenCalledTimes(4)

      expect(extractJobDetailMock).toHaveBeenCalledWith(description)
    })

    it('should pass the detail locator and current URL to the parser', async () => {
      const element = setupDetailElement()

      const currentUrl = 'https://jobinja.ir/jobs/redirected'

      page.url.mockReturnValue(currentUrl)

      service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

      await provider.getJobsWithoutDetail()

      expect(parser.parseDetail).toHaveBeenCalledWith(element, currentUrl)
    })

    it('should save details using the correct job ID', async () => {
      const jobs = createJobs(4)

      setupDetailElement()

      service.getJobsWithoutDetail.mockResolvedValue(jobs)

      await provider.getJobsWithoutDetail()

      jobs.forEach((job, index) => {
        expect(service.saveJobDetail).toHaveBeenNthCalledWith(
          index + 1,
          job.id,
          expect.objectContaining({
            applicationUrl: 'https://jobinja.ir/jobs/1',
          }),
        )
      })
    })

    // ----------------------------------------------
    // updateJobDetail
    // ----------------------------------------------

    describe('job detail merging', () => {
      it('should merge parsed and extracted job details', async () => {
        const jobs = createJobs(4)

        const parsedDetail = createCrawledJobDetail()

        const extractedDetail = createExtractedJob()

        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(jobs)

        parser.parseDetail.mockResolvedValue(parsedDetail)

        extractJobDetailMock.mockResolvedValue(extractedDetail)

        await provider.getJobsWithoutDetail()

        expect(service.saveJobDetail).toHaveBeenNthCalledWith(1, jobs[0].id, {
          ...parsedDetail,

          description: extractedDetail.description,

          skills: extractedDetail.skills,

          responsibilities: extractedDetail.responsibilities,

          requirements: extractedDetail.requirements,

          preferredQualifications: extractedDetail.preferredQualifications,

          benefits: extractedDetail.benefits,

          workMode: extractedDetail.workMode,

          visaSponsorship: extractedDetail.visaSponsorship,
        })
      })

      it('should preserve fields extracted by the parser', async () => {
        const parsedDetail = createCrawledJobDetail()

        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        parser.parseDetail.mockResolvedValue(parsedDetail)

        await provider.getJobsWithoutDetail()

        expect(service.saveJobDetail).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({
            category: parsedDetail.category,
            salary: parsedDetail.salary,
            experience: parsedDetail.experience,
            applicationUrl: parsedDetail.applicationUrl,
          }),
        )
      })

      it('should prioritize extracted skills over parsed skills', async () => {
        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        parser.parseDetail.mockResolvedValue(
          createCrawledJobDetail({
            skills: ['JavaScript'],
          }),
        )

        extractJobDetailMock.mockResolvedValue(
          createExtractedJob({
            skills: ['React', 'TypeScript'],
          }),
        )

        await provider.getJobsWithoutDetail()

        expect(service.saveJobDetail).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({
            skills: ['React', 'TypeScript'],
          }),
        )
      })

      it('should prioritize extracted work mode over parsed work mode', async () => {
        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        parser.parseDetail.mockResolvedValue(
          createCrawledJobDetail({
            workMode: EWorkMode.ONSITE,
          }),
        )

        extractJobDetailMock.mockResolvedValue(
          createExtractedJob({
            workMode: EWorkMode.REMOTE,
          }),
        )

        await provider.getJobsWithoutDetail()

        expect(service.saveJobDetail).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({
            workMode: EWorkMode.REMOTE,
          }),
        )
      })

      it('should convert an empty description to undefined', async () => {
        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        extractJobDetailMock.mockResolvedValue(
          createExtractedJob({
            description: '',
          }),
        )

        await provider.getJobsWithoutDetail()

        expect(service.saveJobDetail).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({
            description: undefined,
          }),
        )
      })

      it('should handle missing optional extracted fields', async () => {
        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        extractJobDetailMock.mockResolvedValue({
          ...createExtractedJob(),
          workMode: undefined,
          visaSponsorship: undefined,
        })

        await provider.getJobsWithoutDetail()

        expect(service.saveJobDetail).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({
            workMode: undefined,
            visaSponsorship: undefined,
          }),
        )
      })

      it('should preserve empty extracted arrays', async () => {
        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        extractJobDetailMock.mockResolvedValue(
          createExtractedJob({
            skills: [],
            responsibilities: [],
            requirements: [],
            preferredQualifications: [],
            benefits: [],
          }),
        )

        await provider.getJobsWithoutDetail()

        expect(service.saveJobDetail).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({
            skills: [],
            responsibilities: [],
            requirements: [],
            preferredQualifications: [],
            benefits: [],
          }),
        )
      })

      it('should not mutate the original parsed job detail', async () => {
        const parsedDetail = createCrawledJobDetail()

        const originalDetail = structuredClone(parsedDetail)

        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        parser.parseDetail.mockResolvedValue(parsedDetail)

        await provider.getJobsWithoutDetail()

        expect(parsedDetail).toEqual(originalDetail)
      })

      it('should not save details when the parser returns undefined', async () => {
        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        parser.parseDetail.mockResolvedValue(undefined)

        await provider.getJobsWithoutDetail()

        expect(extractJobDetailMock).toHaveBeenCalledTimes(4)

        expect(service.saveJobDetail).not.toHaveBeenCalled()
      })
    })

    // ----------------------------------------------
    // Detail Error Handling
    // ----------------------------------------------

    describe('error handling', () => {
      it('should skip jobs without a URL', async () => {
        const jobs = createJobs(4)

        jobs[0].url = ''

        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(jobs)

        await provider.getJobsWithoutDetail()

        expect(page.goto).toHaveBeenCalledTimes(3)

        expect(service.saveJobDetail).toHaveBeenCalledTimes(3)

        expect(service.saveJobDetail).not.toHaveBeenCalledWith('job-1', expect.anything())
      })

      it('should skip jobs when navigation fails', async () => {
        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        page.goto.mockRejectedValueOnce(new Error('Navigation failed'))

        await provider.getJobsWithoutDetail()

        expect(page.goto).toHaveBeenCalledTimes(4)

        expect(parser.parseDetail).toHaveBeenCalledTimes(3)

        expect(service.saveJobDetail).toHaveBeenCalledTimes(3)
      })

      it('should skip jobs when the detail selector does not exist', async () => {
        setupDetailElement(
          createLocator({
            count: 0,
          }),
        )

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        await provider.getJobsWithoutDetail()

        expect(extractJobDetailMock).not.toHaveBeenCalled()

        expect(parser.parseDetail).not.toHaveBeenCalled()

        expect(service.saveJobDetail).not.toHaveBeenCalled()
      })

      it('should continue when waiting for the detail element fails', async () => {
        const element = setupDetailElement()

        vi.spyOn(element, 'waitFor').mockRejectedValueOnce(new Error('Element timeout'))

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        await provider.getJobsWithoutDetail()

        expect(service.saveJobDetail).toHaveBeenCalledTimes(3)
      })

      it('should continue when reading the job description fails', async () => {
        const element = setupDetailElement()

        vi.spyOn(element, 'innerText').mockRejectedValueOnce(
          new Error('Failed reading description'),
        )

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        await provider.getJobsWithoutDetail()

        expect(extractJobDetailMock).toHaveBeenCalledTimes(3)

        expect(service.saveJobDetail).toHaveBeenCalledTimes(3)
      })

      it('should continue when AI extraction fails', async () => {
        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        extractJobDetailMock.mockRejectedValueOnce(new Error('AI extraction failed'))

        await provider.getJobsWithoutDetail()

        expect(extractJobDetailMock).toHaveBeenCalledTimes(4)

        expect(parser.parseDetail).toHaveBeenCalledTimes(3)

        expect(service.saveJobDetail).toHaveBeenCalledTimes(3)
      })

      it('should continue when detail parsing fails', async () => {
        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        parser.parseDetail.mockRejectedValueOnce(new Error('Detail parsing failed'))

        await provider.getJobsWithoutDetail()

        expect(parser.parseDetail).toHaveBeenCalledTimes(4)

        expect(service.saveJobDetail).toHaveBeenCalledTimes(3)
      })

      it('should continue when saving job detail fails', async () => {
        const jobs = createJobs(4)

        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(jobs)

        service.saveJobDetail.mockRejectedValueOnce(new Error('Database error'))

        const result = await provider.getJobsWithoutDetail()

        expect(result).toEqual(jobs)

        expect(service.saveJobDetail).toHaveBeenCalledTimes(4)
      })

      it('should propagate errors when fetching jobs without details fails', async () => {
        const error = new Error('Database unavailable')

        service.getJobsWithoutDetail.mockRejectedValueOnce(error)

        await expect(provider.getJobsWithoutDetail()).rejects.toBe(error)

        expect(page.goto).not.toHaveBeenCalled()

        expect(service.saveJobDetail).not.toHaveBeenCalled()
      })

      it('should log the original processing error', async () => {
        const logSpy = vi.spyOn(console, 'log')

        const error = new Error('Extraction failed')

        setupDetailElement()

        service.getJobsWithoutDetail.mockResolvedValue(createJobs(4))

        extractJobDetailMock.mockRejectedValueOnce(error)

        await provider.getJobsWithoutDetail()

        expect(logSpy).toHaveBeenCalledWith('jobinja provider: getJobsWithoutDetail() -> error:', {
          error,
        })
      })
    })
  })
})
