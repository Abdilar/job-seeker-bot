import type { Locator } from 'playwright'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EContractType, EProvider } from '../../../types'
import { JobInJaParser } from './jab-in-ja.parse'

describe('JobInJaParser', () => {
  const parser = new JobInJaParser()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-27T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('parses a complete Jobinja job', async () => {
    const content = createJobLocator({
      url: 'https://jobinja.ir/companies/example/jobs/123',
      title: '  Senior Frontend Engineer  ',
      passedDays: '۲ روز پیش',
      company: 'شرکت نمونه | Example Company',
      location: 'تهران، تهران',
      contractType: 'قرارداد تمام وقت',
      salary: '(حقوق از ۵۰ میلیون تومان)',
    })

    const result = await parser.parse(content)

    expect(result).toEqual({
      title: 'Senior Frontend Engineer',
      url: 'https://jobinja.ir/companies/example/jobs/123',
      provider: EProvider.JOB_IN_JA,
      postedAt: new Date('2026-09-25T10:00:00.000Z'),
      contractType: EContractType.FULL_TIME,
      salary: ' ۵۰ میلیون تومان',
      location: {
        country: 'ایران',
        province: 'تهران',
      },
      company: {
        fullName: 'شرکت نمونه | Example Company',
        persianName: 'شرکت نمونه',
        englishName: 'Example Company',
      },
    })
  })

  it('parses a job without salary', async () => {
    const content = createJobLocator({
      url: 'https://jobinja.ir/companies/example/jobs/123',
      title: 'Frontend Engineer',
      passedDays: '۱ روز پیش',
      company: 'شرکت نمونه | Example Company',
      location: 'تهران، تهران',
      contractType: 'قرارداد تمام وقت',
      salary: null,
    })

    const result = await parser.parse(content)

    expect(result).toBeDefined()
    expect(result?.salary).toBe('')
    expect(result?.postedAt).toEqual(new Date('2026-09-26T10:00:00.000Z'))
  })

  it('uses today when passed days does not contain a number', async () => {
    const content = createJobLocator({
      url: 'https://jobinja.ir/companies/example/jobs/123',
      title: 'Frontend Engineer',
      passedDays: 'امروز',
      company: 'Example Company',
      location: 'تهران، تهران',
      contractType: 'قرارداد تمام وقت',
      salary: null,
    })

    const result = await parser.parse(content)

    expect(result?.postedAt).toEqual(new Date('2026-09-27T10:00:00.000Z'))
  })

  it('returns undefined when job URL is missing', async () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})

    const content = createJobLocator({
      url: null,
      title: 'Frontend Engineer',
      passedDays: '۱ روز پیش',
      company: 'Example Company',
      location: 'تهران، تهران',
      contractType: 'قرارداد تمام وقت',
      salary: null,
    })

    const result = await parser.parse(content)

    expect(result).toBeUndefined()

    expect(consoleErrorMock).toHaveBeenCalledWith('Jobinja parser has been occurred an Error!')
  })

  it('returns undefined when reading the content fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const content = {
      locator: vi.fn(() => {
        throw new Error('Playwright failed')
      }),
    } as unknown as Locator

    const result = await parser.parse(content)

    expect(result).toBeUndefined()
  })
})

interface JobLocatorData {
  url: string | null
  title: string | null
  passedDays: string | null
  company: string | null
  location: string | null
  contractType: string | null
  salary?: string | null
}

function createJobLocator(data: JobLocatorData): Locator {
  const textLocator = (value: string | null) =>
    ({
      textContent: vi.fn().mockResolvedValue(value),
    }) as unknown as Locator

  const titleLocator = {
    getAttribute: vi.fn().mockResolvedValue(data.url),
    textContent: vi.fn().mockResolvedValue(data.title),
  } as unknown as Locator

  const salaryLocator = {
    count: vi.fn().mockResolvedValue(data.salary === null ? 0 : 1),
    textContent: vi.fn().mockResolvedValue(data.salary ?? null),
  } as unknown as Locator

  const contractContainer = {
    nth: vi.fn((index: number) => {
      if (index === 0) {
        return textLocator(data.contractType)
      }

      return salaryLocator
    }),
  } as unknown as Locator

  const attributes = {
    nth: vi.fn((index: number) => {
      if (index === 0) {
        return {
          locator: vi.fn(() => textLocator(data.company)),
        }
      }

      if (index === 1) {
        return {
          locator: vi.fn(() => textLocator(data.location)),
        }
      }

      return {
        locator: vi.fn(() => contractContainer),
      }
    }),
  } as unknown as Locator

  return {
    locator: vi.fn((selector: string) => {
      if (selector === '.c-jobListView__titleLink') {
        return titleLocator
      }

      if (selector === '.c-jobListView__passedDays') {
        return textLocator(data.passedDays)
      }

      if (selector === '.c-jobListView__metaItem') {
        return attributes
      }

      throw new Error(`Unexpected selector: ${selector}`)
    }),
  } as unknown as Locator
}
