import type { Locator } from 'playwright'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EContractType, EProvider } from '../../../types'
import { JobVisionParser } from './job-vision.parser'
import {
  COMPANY_SELECTOR,
  LOCATION_SELECTOR,
  PART_TIME_SELECTOR,
  PASSED_DAYS_SELECTOR,
  SALARY_CURRENCY,
  SALARY_SELECTOR,
  TITLE_SELECTOR,
} from './job-vision.constant'

describe('JobVisionParser', () => {
  const parser = new JobVisionParser()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-27T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('parses a complete Jobvision job', async () => {
    const content = createJobLocator({
      href: '/jobs/1566713/استخدام-سرپرست-کنترل-کیفیت?row=1&pageSize=30&searchId=392758327566553072',
      title: '  سرپرست کنترل کیفیت  ',
      passedDays: ' امروز ',
      company: ' آوین تجارت پرتو ',
      city: 'رشت',
      isPartTime: false,
      salary: '45 - 60 میلیون تومان',
    })

    const result = await parser.parse(content)

    expect(result).toEqual({
      title: 'سرپرست کنترل کیفیت',
      url: 'https://jobvision.ir/jobs/1566713',
      provider: EProvider.JOB_VISION,
      postedAt: new Date('2026-09-27T10:00:00.000Z'),
      contractType: EContractType.FULL_TIME,
      salary: '45 - 60 میلیون تومان',
      location: {
        country: 'ایران',
        province: 'رشت',
      },
      company: {
        fullName: 'آوین تجارت پرتو',
      },
    })
  })

  it('reads the first element when a selector matches several', async () => {
    const content = createJobLocator({ ...completeJob, multiMatch: true })

    const result = await parser.parse(content)

    expect(result?.title).toBe('سرپرست کنترل کیفیت')
    expect(result?.salary).toBe('45 - 60 میلیون تومان')
  })

  it('keeps the same url for the same job across different searches', async () => {
    const firstSearch = createJobLocator({
      ...completeJob,
      href: '/jobs/1566713/استخدام-سرپرست?row=1&searchId=111',
    })
    const secondSearch = createJobLocator({
      ...completeJob,
      href: '/jobs/1566713/استخدام-سرپرست?row=7&searchId=222',
    })

    const firstResult = await parser.parse(firstSearch)
    const secondResult = await parser.parse(secondSearch)

    expect(firstResult?.url).toBe('https://jobvision.ir/jobs/1566713')
    expect(secondResult?.url).toBe(firstResult?.url)
  })

  it('parses a part-time job', async () => {
    const content = createJobLocator({ ...completeJob, isPartTime: true })

    const result = await parser.parse(content)

    expect(result?.contractType).toBe(EContractType.PART_TIME)
  })

  it('parses passed days', async () => {
    const content = createJobLocator({ ...completeJob, passedDays: '31 روز پیش' })

    const result = await parser.parse(content)

    expect(result?.postedAt).toEqual(new Date('2026-08-27T10:00:00.000Z'))
  })

  it('parses yesterday as one day ago', async () => {
    const content = createJobLocator({ ...completeJob, passedDays: 'دیروز' })

    const result = await parser.parse(content)

    expect(result?.postedAt).toEqual(new Date('2026-09-26T10:00:00.000Z'))
  })

  it('uses today when passed days does not exist', async () => {
    const content = createJobLocator({ ...completeJob, passedDays: null })

    const result = await parser.parse(content)

    expect(result?.postedAt).toEqual(new Date('2026-09-27T10:00:00.000Z'))
  })

  it('parses a job without salary', async () => {
    const content = createJobLocator({ ...completeJob, salary: null })

    const result = await parser.parse(content)

    expect(result).toBeDefined()
    expect(result?.salary).toBe('')
  })

  it('parses a job without city', async () => {
    const content = createJobLocator({ ...completeJob, city: null })

    const result = await parser.parse(content)

    expect(result?.location).toEqual({
      country: 'ایران',
      province: '',
    })
  })

  it('returns empty company when company does not exist', async () => {
    const content = createJobLocator({ ...completeJob, company: null })

    const result = await parser.parse(content)

    expect(result?.company).toEqual({ fullName: '' })
  })

  it('returns undefined when job URL is missing', async () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})

    const content = createJobLocator({ ...completeJob, href: null })

    const result = await parser.parse(content)

    expect(result).toBeUndefined()

    expect(consoleErrorMock).toHaveBeenCalledWith('Jobvision parser has been occurred an Error!')
  })

  it('returns undefined when job URL does not contain a job id', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const content = createJobLocator({ ...completeJob, href: '/companies/225399/example' })

    const result = await parser.parse(content)

    expect(result).toBeUndefined()
  })

  it('returns undefined when reading the content fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const content = {
      getAttribute: vi.fn().mockRejectedValue(new Error('Playwright failed')),
    } as unknown as Locator

    const result = await parser.parse(content)

    expect(result).toBeUndefined()
  })
})

interface JobLocatorData {
  href: string | null
  title: string | null
  passedDays: string | null
  company: string | null
  city: string | null
  isPartTime: boolean
  salary: string | null
  multiMatch?: boolean
}

const completeJob: JobLocatorData = {
  href: '/jobs/1566713/استخدام-سرپرست-کنترل-کیفیت?row=1',
  title: 'سرپرست کنترل کیفیت',
  passedDays: 'امروز',
  company: 'آوین تجارت پرتو',
  city: 'رشت',
  isPartTime: false,
  salary: '45 - 60 میلیون تومان',
}

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
    locator: vi.fn((selector: string, options?: { hasText?: string }) => {
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

      if (selector === PART_TIME_SELECTOR) {
        return textLocator(data.isPartTime ? 'پاره وقت' : null)
      }

      if (selector === SALARY_SELECTOR) {
        if (options?.hasText !== SALARY_CURRENCY) {
          return textLocator(null)
        }

        return data.multiMatch ? strictLocator(data.salary) : textLocator(data.salary)
      }

      throw new Error(`Unexpected selector: ${selector}`)
    }),
  } as unknown as Locator
}
