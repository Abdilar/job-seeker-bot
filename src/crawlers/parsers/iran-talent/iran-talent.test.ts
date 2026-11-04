import type { Locator } from 'playwright'
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

  beforeEach(() => {
    parser = new IranTalentParser(new Map())
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

  it('takes the contract type from the map of the current page', async () => {
    parser = new IranTalentParser(new Map([['186192', EContractType.PART_TIME]]))
    const content = createJobLocator(completeJob)

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.PART_TIME)
  })

  it('keeps a job the map marks as full time', async () => {
    parser = new IranTalentParser(new Map([['186192', EContractType.FULL_TIME]]))
    const content = createJobLocator(completeJob)

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.FULL_TIME)
  })

  it('falls back to full time for a job the map does not hold', async () => {
    parser = new IranTalentParser(new Map([['999999', EContractType.PART_TIME]]))
    const content = createJobLocator(completeJob)

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.FULL_TIME)
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

function createJobLocator(data: JobLocatorData): Locator {
  return {
    getAttribute: vi.fn().mockResolvedValue(data.href),
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
