import type { Locator, Page } from 'playwright'
import { describe, expect, it, vi } from 'vitest'
import type { JobParser } from '../../parsers'
import { EContractType, EProvider, type ICrawledJob } from '../../../types'
import { JobInJaProduct } from './job-in-ja.product'
import { JOB_IN_JA_URL, MAIN_ELEMENT_SELECTOR } from './job-in-ja.constant'
import { WAIT_UNTIL } from '../../constants'

vi.mock('../../../utilities', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utilities')>()

  return {
    ...actual,
    randomDelay: vi.fn().mockResolvedValue(undefined),
  }
})

describe('JobInJaProduct', () => {
  it('initializes provider and fetches jobs from a single page', async () => {
    const job: ICrawledJob = {
      title: 'Senior Frontend Engineer',
      url: 'https://example.com/jobs/1',
      contractType: EContractType.FULL_TIME,
      provider: EProvider.JOB_IN_JA,
      company: {
        fullName: 'Example Company',
      },
      location: {
        country: 'Iran',
        province: 'Tehran',
      },
    }

    const jobElement = {} as Locator

    const jobElements = {
      count: vi.fn().mockResolvedValue(1),
      nth: vi.fn().mockReturnValue(jobElement),
    } as unknown as Locator

    const mainElement = {
      locator: vi.fn().mockReturnValue(jobElements),
    } as unknown as Locator

    // No pagination => getLastPage() should return 1
    const paginationElements = {
      count: vi.fn().mockResolvedValue(0),
    } as unknown as Locator

    const locatorMock = vi.fn((selector: string) => {
      if (selector === MAIN_ELEMENT_SELECTOR) {
        return mainElement
      }

      if (selector === '#js-jobSearchPaginator ul > li') {
        return paginationElements
      }

      throw new Error(`Unexpected selector: ${selector}`)
    })

    const gotoMock = vi.fn().mockResolvedValue(null)

    const page = {
      goto: gotoMock,
      locator: locatorMock,
    } as unknown as Page

    const parseMock = vi.fn<JobParser['parse']>().mockResolvedValue(job)

    const parser = {
      parse: parseMock,
    } as unknown as JobParser

    const provider = new JobInJaProduct(page, parser)

    await provider.initialize()

    const jobs = await provider.getJobs()

    expect(gotoMock).toHaveBeenCalledWith(JOB_IN_JA_URL, {
      waitUntil: WAIT_UNTIL,
    })

    expect(locatorMock).toHaveBeenCalledWith(MAIN_ELEMENT_SELECTOR)

    expect(parseMock).toHaveBeenCalledOnce()
    expect(parseMock).toHaveBeenCalledWith(jobElement)

    expect(jobs).toEqual([job])
  })

  it('fetches jobs from multiple pages', async () => {
    const firstJob: ICrawledJob = {
      title: 'Frontend Engineer',
      url: 'https://example.com/jobs/1',
      contractType: EContractType.FULL_TIME,
      provider: EProvider.JOB_IN_JA,
      company: {
        fullName: 'Company A',
      },
      location: {
        country: 'Iran',
        province: 'Tehran',
      },
    }

    const secondJob: ICrawledJob = {
      title: 'React Developer',
      url: 'https://example.com/jobs/2',
      contractType: EContractType.FULL_TIME,
      provider: EProvider.JOB_IN_JA,
      company: {
        fullName: 'Company B',
      },
      location: {
        country: 'Iran',
        province: 'Tehran',
      },
    }

    const firstJobElement = {} as Locator
    const secondJobElement = {} as Locator

    const firstPageJobs = {
      count: vi.fn().mockResolvedValue(1),
      nth: vi.fn().mockReturnValue(firstJobElement),
    } as unknown as Locator

    const secondPageJobs = {
      count: vi.fn().mockResolvedValue(1),
      nth: vi.fn().mockReturnValue(secondJobElement),
    } as unknown as Locator

    const firstMainElement = {
      locator: vi.fn().mockReturnValue(firstPageJobs),
    } as unknown as Locator

    const secondMainElement = {
      locator: vi.fn().mockReturnValue(secondPageJobs),
    } as unknown as Locator

    const lastPageLink = {
      textContent: vi.fn().mockResolvedValue('۲'),
    } as unknown as Locator

    const lastPageItem = {
      locator: vi.fn().mockReturnValue(lastPageLink),
    } as unknown as Locator

    /*
     * getLastPage() uses:
     *
     * paginationElements.count()
     * paginationElements.nth(total - 2)
     *                   .locator("a")
     *                   .textContent()
     */
    const paginationElements = {
      count: vi.fn().mockResolvedValue(4),
      nth: vi.fn().mockReturnValue(lastPageItem),
    } as unknown as Locator

    let mainElementCall = 0

    const locatorMock = vi.fn((selector: string) => {
      if (selector === MAIN_ELEMENT_SELECTOR) {
        mainElementCall++

        return mainElementCall === 1 ? firstMainElement : secondMainElement
      }

      if (selector === '#js-jobSearchPaginator ul > li') {
        return paginationElements
      }

      throw new Error(`Unexpected selector: ${selector}`)
    })

    const gotoMock = vi.fn().mockResolvedValue(null)

    const page = {
      goto: gotoMock,
      locator: locatorMock,
    } as unknown as Page

    const parseMock = vi
      .fn<JobParser['parse']>()
      .mockResolvedValueOnce(firstJob)
      .mockResolvedValueOnce(secondJob)

    const parser = {
      parse: parseMock,
    } as unknown as JobParser

    const provider = new JobInJaProduct(page, parser)

    await provider.initialize()

    const jobs = await provider.getJobs()

    expect(jobs).toEqual([firstJob, secondJob])

    expect(parseMock).toHaveBeenCalledTimes(2)
    expect(parseMock).toHaveBeenNthCalledWith(1, firstJobElement)
    expect(parseMock).toHaveBeenNthCalledWith(2, secondJobElement)

    expect(gotoMock).toHaveBeenCalledTimes(2)

    expect(gotoMock).toHaveBeenNthCalledWith(1, JOB_IN_JA_URL, {
      waitUntil: WAIT_UNTIL,
    })

    expect(gotoMock).toHaveBeenNthCalledWith(2, `${JOB_IN_JA_URL}&page=2`, {
      waitUntil: WAIT_UNTIL,
    })
  })

  it('skips jobs that cannot be parsed and continues with remaining jobs', async () => {
    const validJob: ICrawledJob = {
      title: 'Frontend Engineer',
      url: 'https://example.com/jobs/2',
      contractType: EContractType.FULL_TIME,
      provider: EProvider.JOB_IN_JA,
      company: {
        fullName: 'Example Company',
      },
      location: {
        country: 'Iran',
        province: 'Tehran',
      },
    }

    const invalidJobElement = {} as Locator
    const validJobElement = {} as Locator

    const jobElements = {
      count: vi.fn().mockResolvedValue(2),
      nth: vi.fn().mockReturnValueOnce(invalidJobElement).mockReturnValueOnce(validJobElement),
    } as unknown as Locator

    const mainElement = {
      locator: vi.fn().mockReturnValue(jobElements),
    } as unknown as Locator

    const paginationElements = {
      count: vi.fn().mockResolvedValue(0),
    } as unknown as Locator

    const locatorMock = vi.fn((selector: string) => {
      if (selector === MAIN_ELEMENT_SELECTOR) {
        return mainElement
      }

      if (selector === '#js-jobSearchPaginator ul > li') {
        return paginationElements
      }

      throw new Error(`Unexpected selector: ${selector}`)
    })

    const page = {
      goto: vi.fn().mockResolvedValue(null),
      locator: locatorMock,
    } as unknown as Page

    const parseMock = vi
      .fn<JobParser['parse']>()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(validJob)

    const parser = {
      parse: parseMock,
    } as unknown as JobParser
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})
    const provider = new JobInJaProduct(page, parser)
    await provider.initialize()
    const jobs = await provider.getJobs()

    expect(parseMock).toHaveBeenCalledTimes(2)
    expect(parseMock).toHaveBeenNthCalledWith(1, invalidJobElement)
    expect(parseMock).toHaveBeenNthCalledWith(2, validJobElement)
    expect(jobs).toEqual([validJob])
    expect(consoleErrorMock).toHaveBeenCalledOnce()
  })

  it('returns an empty array when no job elements are found', async () => {
    const jobElements = {
      count: vi.fn().mockResolvedValue(0),
    } as unknown as Locator

    const mainElement = {
      locator: vi.fn().mockReturnValue(jobElements),
    } as unknown as Locator

    const paginationElements = {
      count: vi.fn().mockResolvedValue(0),
    } as unknown as Locator

    const locatorMock = vi.fn((selector: string) => {
      if (selector === MAIN_ELEMENT_SELECTOR) {
        return mainElement
      }

      if (selector === '#js-jobSearchPaginator ul > li') {
        return paginationElements
      }

      throw new Error(`Unexpected selector: ${selector}`)
    })

    const page = {
      goto: vi.fn().mockResolvedValue(null),
      locator: locatorMock,
    } as unknown as Page
    const parseMock = vi.fn<JobParser['parse']>()
    const parser = {
      parse: parseMock,
    } as unknown as JobParser
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})
    const provider = new JobInJaProduct(page, parser)
    await provider.initialize()
    const jobs = await provider.getJobs()

    expect(jobs).toEqual([])
    expect(parseMock).not.toHaveBeenCalled()
    expect(consoleErrorMock).toHaveBeenCalledOnce()
    expect(consoleErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'No job elements found.',
      }),
    )
  })

  it('returns an empty array when getJobs is called before initialize', async () => {
    const page = {} as Page
    const parseMock = vi.fn<JobParser['parse']>()
    const parser = {
      parse: parseMock,
    } as unknown as JobParser
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})
    const provider = new JobInJaProduct(page, parser)
    const jobs = await provider.getJobs()

    expect(jobs).toEqual([])
    expect(parseMock).not.toHaveBeenCalled()
    expect(consoleErrorMock).toHaveBeenCalledOnce()
    expect(consoleErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'mainElement is required: undefined',
      }),
    )
  })

  it('falls back to one page when the last page number is invalid', async () => {
    const job: ICrawledJob = {
      title: 'Frontend Engineer',
      url: 'https://example.com/jobs/1',
      contractType: EContractType.FULL_TIME,
      provider: EProvider.JOB_IN_JA,
      company: {
        fullName: 'Example Company',
      },
      location: {
        country: 'Iran',
        province: 'Tehran',
      },
    }

    const jobElement = {} as Locator

    const jobElements = {
      count: vi.fn().mockResolvedValue(1),
      nth: vi.fn().mockReturnValue(jobElement),
    } as unknown as Locator

    const mainElement = {
      locator: vi.fn().mockReturnValue(jobElements),
    } as unknown as Locator

    const lastPageLink = {
      textContent: vi.fn().mockResolvedValue('invalid'),
    } as unknown as Locator

    const lastPageItem = {
      locator: vi.fn().mockReturnValue(lastPageLink),
    } as unknown as Locator

    const paginationElements = {
      count: vi.fn().mockResolvedValue(3),
      nth: vi.fn().mockReturnValue(lastPageItem),
    } as unknown as Locator
    const gotoMock = vi.fn().mockResolvedValue(null)
    const page = {
      goto: gotoMock,

      locator: vi.fn((selector: string) => {
        if (selector === MAIN_ELEMENT_SELECTOR) {
          return mainElement
        }

        if (selector === '#js-jobSearchPaginator ul > li') {
          return paginationElements
        }

        throw new Error(`Unexpected selector: ${selector}`)
      }),
    } as unknown as Page
    const parseMock = vi.fn<JobParser['parse']>().mockResolvedValue(job)
    const parser = {
      parse: parseMock,
    } as unknown as JobParser
    const provider = new JobInJaProduct(page, parser)
    await provider.initialize()
    const jobs = await provider.getJobs()

    expect(jobs).toEqual([job])
    expect(parseMock).toHaveBeenCalledOnce()
    expect(gotoMock).toHaveBeenCalledOnce()
    expect(gotoMock).toHaveBeenCalledWith(JOB_IN_JA_URL, {
      waitUntil: WAIT_UNTIL,
    })
  })

  it('navigates to the next page even when fetching the current page fails', async () => {
    const secondJob: ICrawledJob = {
      title: 'React Developer',
      url: 'https://example.com/jobs/2',
      contractType: EContractType.FULL_TIME,
      provider: EProvider.JOB_IN_JA,
      company: {
        fullName: 'Company B',
      },
      location: {
        country: 'Iran',
        province: 'Tehran',
      },
    }

    const firstPageJobs = {
      count: vi.fn().mockResolvedValue(0),
    } as unknown as Locator

    const secondJobElement = {} as Locator

    const secondPageJobs = {
      count: vi.fn().mockResolvedValue(1),
      nth: vi.fn().mockReturnValue(secondJobElement),
    } as unknown as Locator

    const firstMainElement = {
      locator: vi.fn().mockReturnValue(firstPageJobs),
    } as unknown as Locator

    const secondMainElement = {
      locator: vi.fn().mockReturnValue(secondPageJobs),
    } as unknown as Locator

    const lastPageLink = {
      textContent: vi.fn().mockResolvedValue('۲'),
    } as unknown as Locator

    const lastPageItem = {
      locator: vi.fn().mockReturnValue(lastPageLink),
    } as unknown as Locator

    const paginationElements = {
      count: vi.fn().mockResolvedValue(4),
      nth: vi.fn().mockReturnValue(lastPageItem),
    } as unknown as Locator

    let mainElementCall = 0

    const locatorMock = vi.fn((selector: string) => {
      if (selector === MAIN_ELEMENT_SELECTOR) {
        mainElementCall++

        return mainElementCall === 1 ? firstMainElement : secondMainElement
      }

      if (selector === '#js-jobSearchPaginator ul > li') {
        return paginationElements
      }

      throw new Error(`Unexpected selector: ${selector}`)
    })

    const gotoMock = vi.fn().mockResolvedValue(null)

    const page = {
      goto: gotoMock,
      locator: locatorMock,
    } as unknown as Page

    const parseMock = vi.fn<JobParser['parse']>().mockResolvedValue(secondJob)
    const parser = {
      parse: parseMock,
    } as unknown as JobParser
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const provider = new JobInJaProduct(page, parser)
    await provider.initialize()
    const jobs = await provider.getJobs()

    expect(gotoMock).toHaveBeenCalledWith(`${JOB_IN_JA_URL}&page=2`, {
      waitUntil: WAIT_UNTIL,
    })
    expect(parseMock).toHaveBeenCalledWith(secondJobElement)
    expect(jobs).toEqual([secondJob])
  })

  it('rejects when navigation to the next page fails', async () => {
    const job: ICrawledJob = {
      title: 'Frontend Engineer',
      url: 'https://example.com/jobs/1',
      contractType: EContractType.FULL_TIME,
      provider: EProvider.JOB_IN_JA,
      company: {
        fullName: 'Example Company',
      },
      location: {
        country: 'Iran',
        province: 'Tehran',
      },
    }

    const jobElement = {} as Locator

    const jobElements = {
      count: vi.fn().mockResolvedValue(1),
      nth: vi.fn().mockReturnValue(jobElement),
    } as unknown as Locator

    const mainElement = {
      locator: vi.fn().mockReturnValue(jobElements),
    } as unknown as Locator

    const lastPageLink = {
      textContent: vi.fn().mockResolvedValue('۲'),
    } as unknown as Locator

    const lastPageItem = {
      locator: vi.fn().mockReturnValue(lastPageLink),
    } as unknown as Locator

    const paginationElements = {
      count: vi.fn().mockResolvedValue(4),
      nth: vi.fn().mockReturnValue(lastPageItem),
    } as unknown as Locator

    const locatorMock = vi.fn((selector: string) => {
      if (selector === MAIN_ELEMENT_SELECTOR) {
        return mainElement
      }

      if (selector === '#js-jobSearchPaginator ul > li') {
        return paginationElements
      }

      throw new Error(`Unexpected selector: ${selector}`)
    })

    const gotoMock = vi
      .fn()
      // initialize()
      .mockResolvedValueOnce(null)
      // goNextPage()
      .mockRejectedValueOnce(new Error('Navigation failed'))

    const page = {
      goto: gotoMock,
      locator: locatorMock,
    } as unknown as Page

    const parseMock = vi.fn<JobParser['parse']>().mockResolvedValue(job)
    const parser = {
      parse: parseMock,
    } as unknown as JobParser
    const provider = new JobInJaProduct(page, parser)
    await provider.initialize()

    await expect(provider.getJobs()).rejects.toThrow('Navigation failed')
    expect(parseMock).toHaveBeenCalledOnce()
    expect(gotoMock).toHaveBeenCalledTimes(2)
    expect(gotoMock).toHaveBeenNthCalledWith(2, `${JOB_IN_JA_URL}&page=2`, {
      waitUntil: WAIT_UNTIL,
    })
  })
})
