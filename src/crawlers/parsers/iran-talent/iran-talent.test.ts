import type { Locator, Page } from 'playwright'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EContractType, EProvider } from '../../../types'
import { IranTalentParser } from './iran-talent.parser'
import {
  COMPANY_SELECTOR,
  LOCATION_SELECTOR,
  PASSED_DAYS_SELECTOR,
  SALARY_SELECTOR,
  TITLE_SELECTOR,
} from './iran-talent.constant'

interface JobLocatorData {
  href: string | null
  title: string | null
  passedDays: string | null
  company: string | null
  city: string | null
  salary: string | null
  multiMatch?: boolean
}

const completeJob = {
  href: '/job/graphic-designer/186192',
  title: ' طراح گرافیک ',
  passedDays: ' امروز ',
  company: ' زرین رویا ',
  city: 'تهران',
  salary: '45 تا 60 میلیون تومان',
}

describe('IranTalentParser', () => {
  let parser: IranTalentParser
  let consoleWarnMock: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // NOTE: The parser caches the search state per page url, so every test needs its own instance.
    parser = new IranTalentParser()
    consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-27T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('parses a complete IranTalent job', async () => {
    const content = createJobLocator(completeJob)

    const result = await parser.parse(content)

    expect(result).toEqual({
      title: 'طراح گرافیک',
      url: 'https://www.irantalent.com/job/graphic-designer/186192',
      provider: EProvider.IRAN_TALENT,
      postedAt: new Date('2026-09-27T10:00:00.000Z'),
      contractType: EContractType.FULL_TIME,
      salary: '45 تا 60 میلیون تومان',
      location: {
        country: 'ایران',
        province: 'تهران',
      },
      company: {
        fullName: 'زرین رویا',
      },
    })
  })

  it('reads the first element when a selector matches several', async () => {
    const content = createJobLocator({ ...completeJob, multiMatch: true })

    const result = await parser.parse(content)

    expect(result?.title).toBe('طراح گرافیک')
    expect(result?.salary).toBe('45 تا 60 میلیون تومان')
  })

  it('keeps the job url free of tracking query strings', async () => {
    const content = createJobLocator({
      ...completeJob,
      href: '/job/graphic-designer/186192?utm_source=homepage',
    })

    const result = await parser.parse(content)

    expect(result?.url).toBe('https://www.irantalent.com/job/graphic-designer/186192')
  })

  it('parses an absolute href', async () => {
    const content = createJobLocator({
      ...completeJob,
      href: 'https://www.irantalent.com/job/electrical-engineer/186191',
    })

    const result = await parser.parse(content)

    expect(result?.url).toBe('https://www.irantalent.com/job/electrical-engineer/186191')
  })

  it.each([
    ['امروز', '2026-09-27T10:00:00.000Z'],
    ['دیروز', '2026-09-26T10:00:00.000Z'],
    ['2 روز پیش', '2026-09-25T10:00:00.000Z'],
    ['۳ روز پیش', '2026-09-24T10:00:00.000Z'],
    ['این هفته', '2026-09-20T10:00:00.000Z'],
    ['در چند هفته‌ی اخیر', '2026-09-06T10:00:00.000Z'],
    ['حدود یک ماه پیش', '2026-08-28T10:00:00.000Z'],
    ['بیش از یک ماه', '2026-08-27T10:00:00.000Z'],
  ] as const)('converts "%s" into the bucket date', async (passedDays, expected) => {
    const content = createJobLocator({ ...completeJob, passedDays })

    const result = await parser.parse(content)

    expect(result?.postedAt).toEqual(new Date(expected))
  })

  it('falls back to today when the age label is unknown', async () => {
    const content = createJobLocator({ ...completeJob, passedDays: ' به‌زودی ' })

    const result = await parser.parse(content)

    expect(result?.postedAt).toEqual(new Date('2026-09-27T10:00:00.000Z'))
  })

  it('treats an absent age label as today, like the Jobvision parser does', async () => {
    const content = createJobLocator({ ...completeJob, passedDays: null })

    const result = await parser.parse(content)

    expect(result?.postedAt).toEqual(new Date('2026-09-27T10:00:00.000Z'))
  })

  it('parses a job without a salary', async () => {
    const content = createJobLocator({ ...completeJob, salary: null })

    const result = await parser.parse(content)

    expect(result?.salary).toBe('')
  })

  it('returns undefined and logs when the card has no href', async () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})
    const content = createJobLocator({ ...completeJob, href: null })

    const result = await parser.parse(content)

    expect(result).toBeUndefined()
    expect(consoleErrorMock).toHaveBeenCalledWith('IranTalent parser has been occurred an Error!')

    consoleErrorMock.mockRestore()
  })

  it('returns undefined when the href has no job id', async () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})
    const content = createJobLocator({
      ...completeJob,
      href: '/jobs/jobs-for-student-fresh-graduate',
    })

    const result = await parser.parse(content)

    expect(result).toBeUndefined()

    consoleErrorMock.mockRestore()
  })

  it('reads the contract type of the job from the server rendered search state', async () => {
    const { page } = createStatePage({
      state: searchState([{ id: 186192, titleFarsi: 'نیمه وقت' }]),
    })
    const content = createJobLocator(completeJob, page)

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.PART_TIME)
  })

  it('reads the contract type of a boosted job', async () => {
    const { page } = createStatePage({
      state: searchState([], [{ id: 186192, titleFarsi: 'فریلنس' }]),
    })
    const content = createJobLocator(completeJob, page)

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.PART_TIME)
  })

  it('keeps a full time job full time', async () => {
    const { page } = createStatePage({
      state: searchState([{ id: 186192, titleFarsi: 'تمام وقت' }]),
    })
    const content = createJobLocator(completeJob, page)

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.FULL_TIME)
    expect(consoleWarnMock).not.toHaveBeenCalled()
  })

  it('falls back to full time when the page has no search state', async () => {
    const { page, url } = createStatePage({ state: null })
    const content = createJobLocator(completeJob, page)

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.FULL_TIME)
    expect(consoleWarnMock).toHaveBeenCalledWith(
      'IranTalent Parser: The search state is missing, so the jobs of this page are stored as full time.',
      { url },
    )
  })

  it('falls back to full time when the search state is not valid JSON', async () => {
    const { page } = createStatePage({ state: '{ this is not json' })
    const content = createJobLocator(completeJob, page)

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.FULL_TIME)
    expect(consoleWarnMock).toHaveBeenCalledWith(
      'IranTalent Parser: The search state is unreadable, so the jobs of this page are stored as full time.',
      expect.anything(),
    )
  })

  it('falls back to full time when the search state script is empty', async () => {
    const { page } = createStatePage({ state: '' })
    const content = createJobLocator(completeJob, page)

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.FULL_TIME)
    expect(consoleWarnMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to full time for a job the search state does not describe', async () => {
    const { page } = createStatePage({
      state: searchState([{ id: 999999, titleFarsi: 'نیمه وقت' }]),
    })
    const content = createJobLocator(completeJob, page)

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.FULL_TIME)
  })

  it('falls back to full time when the record has no employment type', async () => {
    const { page } = createStatePage({ state: searchState([{ id: 186192 }]) })
    const content = createJobLocator(completeJob, page)

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.FULL_TIME)
  })

  it('reads the contract type of a job whose page also holds a record without an employment type', async () => {
    const { page } = createStatePage({
      state: searchState([{ id: 186193 }, { id: 186192, titleFarsi: 'نیمه وقت' }]),
    })
    const content = createJobLocator(completeJob, page)

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.PART_TIME)
  })

  it('reads the search state once for every card of the same page', async () => {
    const { page, textContentMock } = createStatePage({
      state: searchState([
        { id: 186192, titleFarsi: 'نیمه وقت' },
        { id: 186193, titleFarsi: 'تمام وقت' },
      ]),
    })

    await parser.parse(createJobLocator(completeJob, page))
    await parser.parse(
      createJobLocator({ ...completeJob, href: '/job/graphic-designer/186193' }, page),
    )

    expect(textContentMock).toHaveBeenCalledTimes(1)
  })

  it('reads the search state again after the crawler moves to another page', async () => {
    const firstPage = createStatePage({
      url: 'https://www.irantalent.com/jobs?sortBy=lived_at',
      state: searchState([{ id: 186192, titleFarsi: 'نیمه وقت' }]),
    })
    const secondPage = createStatePage({
      url: 'https://www.irantalent.com/jobs?sortBy=lived_at&page=2',
      state: searchState([{ id: 186192, titleFarsi: 'تمام وقت' }]),
    })

    const firstResult = await parser.parse(createJobLocator(completeJob, firstPage.page))
    const secondResult = await parser.parse(createJobLocator(completeJob, secondPage.page))

    expect(firstResult?.contractType).toBe(EContractType.PART_TIME)
    expect(secondResult?.contractType).toBe(EContractType.FULL_TIME)
  })
})

function textLocator(value: string | null) {
  const locator = {
    count: vi.fn().mockResolvedValue(value === null ? 0 : 1),
    textContent: vi.fn().mockResolvedValue(value),
    first: vi.fn(),
  }

  locator.first.mockReturnValue(locator)

  return locator
}

function strictLocator(value: string | null) {
  const collection = textLocator(value)

  collection.textContent = vi.fn().mockImplementation(async () => {
    throw new Error('strict mode violation: locator resolved to 2 elements')
  })

  collection.first.mockReturnValue(textLocator(value))

  return collection
}

function createJobLocator(data: JobLocatorData, page?: Page): Locator {
  return {
    getAttribute: vi.fn().mockResolvedValue(data.href),
    page: vi.fn().mockReturnValue(page ?? createStatePage().page),
    locator: vi.fn((selector: string) => {
      if (selector === TITLE_SELECTOR) {
        return data.multiMatch ? strictLocator(data.title) : textLocator(data.title)
      }

      if (selector === PASSED_DAYS_SELECTOR) {
        return data.multiMatch ? strictLocator(data.passedDays) : textLocator(data.passedDays)
      }

      if (selector === COMPANY_SELECTOR) {
        return data.multiMatch ? strictLocator(data.company) : textLocator(data.company)
      }

      if (selector === LOCATION_SELECTOR) {
        return data.multiMatch ? strictLocator(data.city) : textLocator(data.city)
      }

      if (selector === SALARY_SELECTOR) {
        return data.multiMatch ? strictLocator(data.salary) : textLocator(data.salary)
      }

      throw new Error(`Unexpected selector: ${selector}`)
    }),
  } as unknown as Locator
}

interface SearchStatePosition {
  id: number
  titleFarsi?: string
}

function searchState(
  positions: SearchStatePosition[],
  boosted: SearchStatePosition[] = [],
): string {
  const toRecord = ({ id, titleFarsi }: SearchStatePosition) => ({
    id,
    ...(titleFarsi ? { employment_type: { title_farsi: titleFarsi } } : {}),
  })

  return JSON.stringify({
    serverSideSearchResult: {
      data: { data: positions.map(toRecord) },
      boosted_positions: boosted.map(toRecord),
    },
  })
}

function createStatePage(options: { url?: string; state?: string | null } = {}): {
  page: Page
  url: string
  textContentMock: ReturnType<typeof vi.fn>
} {
  const { url = 'https://www.irantalent.com/jobs?sortBy=lived_at', state = null } = options

  const textContentMock = vi.fn().mockResolvedValue(state)
  const scriptLocator = {
    count: vi.fn().mockResolvedValue(state === null ? 0 : 1),
    textContent: textContentMock,
  }

  const page = {
    url: vi.fn().mockReturnValue(url),
    locator: vi.fn(() => ({ first: vi.fn().mockReturnValue(scriptLocator) })),
  } as unknown as Page

  return { page, url, textContentMock }
}
