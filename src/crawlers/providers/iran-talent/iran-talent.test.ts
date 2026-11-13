import type { Locator, Page } from 'playwright'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ECrawlMode } from '../../../constants'
import type { IJobService } from '../../../services'
import { EContractType, EProvider, type ICrawledJob } from '../../../types'
import { IranTalentParser, type JobParser } from '../../parsers'
import {
  IRAN_TALENT_RENDER_TIMEOUT,
  IRAN_TALENT_URL,
  JOB_ELEMENT_SELECTOR,
  MAIN_ELEMENT_SELECTOR,
} from './iran-talent.constant'
import { IranTalentProduct } from './iran-talent.product'
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

describe('IranTalentProduct', () => {
  const PAGE_URL = 'https://www.irantalent.com/jobs?sortBy=lived_at'
  const boundaryDate = new Date('2026-09-26T10:00:00')
  const recentDate = new Date('2026-09-27T10:00:00')
  const oldDate = new Date('2026-09-25T10:00:00')

  const createJob = (title: string, postedAt?: Date): ICrawledJob =>
    ({
      title,
      url: `https://www.irantalent.com/job/${encodeURIComponent(title)}/1`,
      contractType: 'full_time',
      company: {
        fullName: 'Test Company',
      },
      location: {
        country: 'Iran',
      },
      provider: EProvider.IRAN_TALENT,
      postedAt,
    }) as ICrawledJob

  let gotoMock: ReturnType<typeof vi.fn>
  let waitForMock: ReturnType<typeof vi.fn>
  let pageLocatorMock: ReturnType<typeof vi.fn>
  let parserParseMock: ReturnType<typeof vi.fn>
  let setParserMock: ReturnType<typeof vi.fn>
  let getLatestJobByProviderMock: ReturnType<typeof vi.fn>

  let page: Page
  let parser: JobParser
  let service: IJobService

  beforeEach(() => {
    vi.clearAllMocks()

    isRecentMock.mockImplementation((postedAt) => postedAt?.getTime() === recentDate.getTime())

    randomDelayMock.mockResolvedValue()

    gotoMock = vi.fn().mockResolvedValue(null)
    waitForMock = vi.fn().mockResolvedValue(undefined)
    pageLocatorMock = vi.fn()
    parserParseMock = vi.fn()
    setParserMock = vi.fn()
    getLatestJobByProviderMock = vi.fn()

    page = {
      goto: gotoMock,
      locator: pageLocatorMock,
      url: vi.fn().mockReturnValue(PAGE_URL),
    } as unknown as Page

    parser = {
      parse: parserParseMock,
      setParser: setParserMock,
    } as unknown as JobParser

    service = {
      getLatestJobByProvider: getLatestJobByProviderMock,
    } as unknown as IJobService
  })

  const createProvider = (mode: ECrawlMode = ECrawlMode.INCREMENTAL): IranTalentProduct =>
    new IranTalentProduct(page, parser, service, mode)

  const mockPagination = (labels: string[]) => ({
    count: vi.fn().mockResolvedValue(labels.length),
    allTextContents: vi.fn().mockResolvedValue(labels),
  })

  const mockJobElements = (count: number) => ({
    count: vi.fn().mockResolvedValue(count),
    nth: vi.fn().mockImplementation(() => ({}) as Locator),
  })

  const setupPage = (
    jobCount: number,
    pageLabels: string[] = ['1'],
    state: string | null = searchState([]),
  ) => {
    const jobElements = mockJobElements(jobCount)

    const mainElement = {
      locator: vi.fn().mockReturnValue(jobElements),
    }

    const firstJobElement = {
      first: vi.fn().mockReturnValue({ waitFor: waitForMock }),
    }

    const pagination = mockPagination(pageLabels)

    const stateScript = {
      count: vi.fn().mockResolvedValue(state === null ? 0 : 1),
      textContent: vi.fn().mockResolvedValue(state),
    }

    const stateElement = {
      first: vi.fn().mockReturnValue(stateScript),
    }

    pageLocatorMock.mockImplementation((selector: string) => {
      if (selector === MAIN_ELEMENT_SELECTOR) {
        return mainElement
      }

      if (selector === JOB_ELEMENT_SELECTOR) {
        return firstJobElement
      }

      if (selector === 'button.page-number') {
        return pagination
      }

      if (selector === 'script#ng-state') {
        return stateElement
      }

      return {} as Locator
    })

    return { jobElements, mainElement, pagination, stateScript }
  }

  // INFO: The provider hands a fresh strategy to the parser before reading the cards, so parsing one card through that strategy proves the page state reached the job.
  const strategyAt = (index: number): IranTalentParser =>
    setParserMock.mock.calls.at(index)?.[0] as IranTalentParser

  const parseContractType = async (href: string, index = -1): Promise<EContractType | undefined> =>
    (await strategyAt(index).parse(createCardLocator(href)))?.contractType

  describe('initialize', () => {
    it('should navigate to IranTalent and wait for the job elements', async () => {
      setupPage(1)

      const provider = createProvider()

      await provider.initialize()

      expect(gotoMock).toHaveBeenCalledWith(IRAN_TALENT_URL, {
        waitUntil: WAIT_UNTIL,
      })

      expect(pageLocatorMock).toHaveBeenCalledWith(MAIN_ELEMENT_SELECTOR)

      expect(waitForMock).toHaveBeenCalledExactlyOnceWith({
        state: 'visible',
        timeout: IRAN_TALENT_RENDER_TIMEOUT,
      })
    })

    it('should reject the initialization when no job card is rendered', async () => {
      setupPage(1)

      waitForMock.mockRejectedValueOnce(new Error('Timeout 15000ms exceeded'))

      const provider = createProvider()

      await expect(provider.initialize()).rejects.toThrow(
        'IranTalent Provider: Job cards have not been rendered.',
      )
    })

    it('should use page 1 when the pagination does not exist', async () => {
      setupPage(1, [])

      parserParseMock.mockResolvedValueOnce(createJob('Only Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(1)
      expect(gotoMock).toHaveBeenCalledExactlyOnceWith(IRAN_TALENT_URL, {
        waitUntil: WAIT_UNTIL,
      })
      expect(randomDelayMock).not.toHaveBeenCalled()
    })

    it('should use page 1 when no pagination button holds a number', async () => {
      const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})

      setupPage(1, ['…'])

      parserParseMock.mockResolvedValueOnce(createJob('Only Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(1)

      expect(consoleErrorMock).toHaveBeenCalledWith(
        "IranTalent Provider: Couldn't read the pagination: ",
        { labels: ['…'] },
      )

      consoleErrorMock.mockRestore()
    })
  })

  describe('FULL mode', () => {
    it('takes the last page from the search state instead of the pagination', async () => {
      setupPage(1, ['1'], searchState([], [], 3))

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(3)
      expect(gotoMock).toHaveBeenLastCalledWith(`${IRAN_TALENT_URL}&page=3`, {
        waitUntil: WAIT_UNTIL,
      })
    })

    it('takes the last page from the largest pagination button, not the last one', async () => {
      setupPage(1, ['3', '1', '2'])

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(3)
      expect(gotoMock).toHaveBeenLastCalledWith(`${IRAN_TALENT_URL}&page=3`, {
        waitUntil: WAIT_UNTIL,
      })
    })

    it('should read the last page from Persian and Arabic-Indic digits', async () => {
      setupPage(1, ['١', '۲', '٣'])

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toHaveLength(3)
    })

    it('should crawl every page and wait for the job elements on each one', async () => {
      setupPage(1, ['1', '2'])

      parserParseMock
        .mockResolvedValueOnce(createJob('Page 1 Job', oldDate))
        .mockResolvedValueOnce(createJob('Page 2 Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Page 1 Job', 'Page 2 Job'])

      expect(gotoMock).toHaveBeenNthCalledWith(1, IRAN_TALENT_URL, {
        waitUntil: WAIT_UNTIL,
      })

      expect(gotoMock).toHaveBeenNthCalledWith(2, `${IRAN_TALENT_URL}&page=2`, {
        waitUntil: WAIT_UNTIL,
      })

      expect(waitForMock).toHaveBeenCalledTimes(2)
      expect(getLatestJobByProviderMock).not.toHaveBeenCalled()
      expect(isRecentMock).not.toHaveBeenCalled()
    })

    it('should skip a job when parser cannot parse it', async () => {
      setupPage(2, ['1'])

      parserParseMock
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(createJob('Valid Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Valid Job'])
    })

    it('should stop crawling when no job elements are found', async () => {
      setupPage(0, ['1', '2'])

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

    it('should get the latest stored IranTalent job', async () => {
      setupPage(1)

      parserParseMock.mockResolvedValueOnce(createJob('Recent Job', recentDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()
      await provider.getJobs()

      expect(getLatestJobByProviderMock).toHaveBeenCalledExactlyOnceWith(EProvider.IRAN_TALENT)
    })

    it('should filter out old jobs using the shared posting timezone', async () => {
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
      setupPage(2, ['1', '2', '3'])

      parserParseMock
        .mockResolvedValueOnce(createJob('Recent Job', recentDate))
        .mockResolvedValueOnce(createJob('Old Job', oldDate))

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs.map((job) => job.title)).toEqual(['Recent Job'])
      expect(parserParseMock).toHaveBeenCalledTimes(2)

      // NOTE: `goNextPage()` still moves to page 2; the walk stops before page 3 is fetched.
      expect(gotoMock).toHaveBeenLastCalledWith(`${IRAN_TALENT_URL}&page=2`, {
        waitUntil: WAIT_UNTIL,
      })
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
      setupPage(1, ['1', '2'])

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
      setupPage(0, ['1', '2'])

      const provider = createProvider(ECrawlMode.INCREMENTAL)

      await provider.initialize()

      const jobs = await provider.getJobs()

      expect(jobs).toEqual([])
      expect(randomDelayMock).not.toHaveBeenCalled()

      // NOTE: Only initialize() navigates; an empty first page must not walk further.
      expect(gotoMock).toHaveBeenCalledOnce()
    })
  })

  describe('search state', () => {
    let consoleWarnMock: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('hands the parser a strategy that reads the contract type of the page', async () => {
      setupPage(1, ['1'], searchState([{ id: 186192, titleFarsi: 'نیمه وقت' }]))

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()
      await provider.getJobs()

      expect(strategyAt(-1)).toBeInstanceOf(IranTalentParser)
      expect(await parseContractType('/job/graphic-designer/186192')).toBe(EContractType.PART_TIME)
      expect(consoleWarnMock).not.toHaveBeenCalled()
    })

    it('reads a boosted job from the search state too', async () => {
      setupPage(1, ['1'], searchState([], [{ id: 186192, titleFarsi: 'فریلنس' }]))

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()
      await provider.getJobs()

      expect(await parseContractType('/job/graphic-designer/186192')).toBe(EContractType.PART_TIME)
    })

    it('keeps a record without an employment type as full time', async () => {
      setupPage(1, ['1'], searchState([{ id: 186192 }]))

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()
      await provider.getJobs()

      expect(await parseContractType('/job/graphic-designer/186192')).toBe(EContractType.FULL_TIME)
      expect(consoleWarnMock).not.toHaveBeenCalled()
    })

    it('replaces the strategy before parsing a card of the page', async () => {
      setupPage(2)

      const calls: string[] = []

      setParserMock.mockImplementation(() => {
        calls.push('setParser')
      })

      parserParseMock.mockImplementation(() => {
        calls.push('parse')

        return createJob('Job', oldDate)
      })

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()
      await provider.getJobs()

      expect(calls).toEqual(['setParser', 'parse', 'parse'])
    })

    it('reads the search state once for every card of the page', async () => {
      const { stateScript } = setupPage(3)

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()
      await provider.getJobs()

      expect(stateScript.textContent).toHaveBeenCalledOnce()
    })

    it('reads the search state again after moving to the next page', async () => {
      const { stateScript } = setupPage(1, ['1', '2'])

      stateScript.textContent
        .mockResolvedValueOnce(searchState([{ id: 186192, titleFarsi: 'نیمه وقت' }]))
        .mockResolvedValueOnce(searchState([{ id: 186192, titleFarsi: 'تمام وقت' }]))

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()
      await provider.getJobs()

      expect(stateScript.textContent).toHaveBeenCalledTimes(2)
      expect(await parseContractType('/job/graphic-designer/186192', 0)).toBe(
        EContractType.PART_TIME,
      )
      expect(await parseContractType('/job/graphic-designer/186192', 1)).toBe(
        EContractType.FULL_TIME,
      )
    })

    it('warns and stores the page as full time when the search state is missing', async () => {
      setupPage(1, ['1'], null)

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()
      await provider.getJobs()

      expect(consoleWarnMock).toHaveBeenCalledWith(
        'IranTalent Provider: The search state is missing, so the jobs of this page are stored as full time.',
        { url: PAGE_URL },
      )
      expect(await parseContractType('/job/graphic-designer/186192')).toBe(EContractType.FULL_TIME)
    })

    it('warns and stores the page as full time when the search state is not valid JSON', async () => {
      setupPage(1, ['1'], '{ this is not json')

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()
      await provider.getJobs()

      expect(consoleWarnMock).toHaveBeenCalledWith(
        'IranTalent Provider: The search state is unreadable, so the jobs of this page are stored as full time.',
        { url: PAGE_URL },
      )
      expect(await parseContractType('/job/graphic-designer/186192')).toBe(EContractType.FULL_TIME)
    })

    it('warns and stores the page as full time when the search state is incomplete', async () => {
      setupPage(1, ['1'], '{}')

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()
      await provider.getJobs()

      expect(consoleWarnMock).toHaveBeenCalledWith(
        'IranTalent Provider: The search state is incomplete, so the jobs of this page are stored as full time.',
        { url: PAGE_URL },
      )
      expect(await parseContractType('/job/graphic-designer/186192')).toBe(EContractType.FULL_TIME)
    })

    it('warns and stores the page as full time when the search state script is empty', async () => {
      setupPage(1, ['1'], '')

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()
      await provider.getJobs()

      expect(consoleWarnMock).toHaveBeenCalledTimes(1)
    })

    it('warns only once when the search state is missing on every page', async () => {
      setupPage(1, ['1', '2'], null)

      parserParseMock.mockResolvedValue(createJob('Job', oldDate))

      const provider = createProvider(ECrawlMode.FULL)

      await provider.initialize()
      await provider.getJobs()

      expect(consoleWarnMock).toHaveBeenCalledTimes(1)
      expect(consoleWarnMock).toHaveBeenCalledWith(
        'IranTalent Provider: The search state is missing, so the jobs of this page are stored as full time.',
        { url: PAGE_URL },
      )
    })
  })
})

interface SearchStatePosition {
  id: number
  titleFarsi?: string
}

function searchState(
  positions: SearchStatePosition[],
  boosted: SearchStatePosition[] = [],
  lastPage?: number,
): string {
  const toRecord = ({ id, titleFarsi }: SearchStatePosition) => ({
    id,
    ...(titleFarsi ? { employment_type: { title_farsi: titleFarsi } } : {}),
  })

  return JSON.stringify({
    serverSideSearchResult: {
      data: {
        data: positions.map(toRecord),
        ...(lastPage ? { last_page: lastPage } : {}),
      },
      boosted_positions: boosted.map(toRecord),
    },
  })
}

// NOTE: A card locator without a `page()` method, so a strategy that still reached the Playwright page would fail these tests.
function createCardLocator(href: string): Locator {
  const textElement = {
    count: vi.fn().mockResolvedValue(1),
    textContent: vi.fn().mockResolvedValue('متن'),
    first: vi.fn(),
  }

  textElement.first.mockReturnValue(textElement)

  return {
    getAttribute: vi.fn().mockResolvedValue(href),
    locator: vi.fn().mockReturnValue(textElement),
  } as unknown as Locator
}
