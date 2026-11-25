import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IJobService } from '../../../services'
import { CONTRACT_TYPE_MAP, PAGINATION_LIMIT, PROVIDER_MAP } from '../../constants'
import type { TelegramContextType } from '../../telegram.model'
import { JobRenderer } from './job.render'

type JobFilter = TelegramContextType['session']['jobFilter']

const mocks = vi.hoisted(() => ({
  getJobs: vi.fn<IJobService['getJobs']>(),
  count: vi.fn<IJobService['count']>(),
  reply: vi.fn<TelegramContextType['reply']>(),
  editMessageText: vi.fn<TelegramContextType['editMessageText']>(),
  formatList: vi.fn(),
  createFilterKeyboard: vi.fn(),
  createListKeyboard: vi.fn(),
  createPaginationKeyboard: vi.fn(),
  append: vi.fn(),
}))

vi.mock('../../formatters', () => ({
  JobFormatter: class {
    formatList = mocks.formatList
  },
}))

vi.mock('../../keyboards', () => ({
  JobFilterKeyboard: class {
    create = mocks.createFilterKeyboard
  },
  JobListKeyboard: class {
    create = mocks.createListKeyboard
  },
  PaginationKeyboard: class {
    create = mocks.createPaginationKeyboard
  },
}))

describe('JobRenderer', () => {
  let renderer: JobRenderer
  let context: TelegramContextType

  const jobs = [
    {
      id: 'job-1',
      title: 'Frontend Developer',
    },
    {
      id: 'job-2',
      title: 'Backend Developer',
    },
  ] as Awaited<ReturnType<IJobService['getJobs']>>

  const filterKeyboard = {
    append: mocks.append,
  }

  const listKeyboard = {
    inline_keyboard: [],
  }

  const paginationKeyboard = {
    inline_keyboard: [],
  }

  const formattedMessage = 'Formatted job list'

  const contractType = Object.keys(CONTRACT_TYPE_MAP)[0] as NonNullable<JobFilter['contractType']>

  const provider = Object.keys(PROVIDER_MAP)[0] as NonNullable<JobFilter['provider']>

  const messageOptions = {
    reply_markup: filterKeyboard,
    parse_mode: 'HTML',
    link_preview_options: {
      is_disabled: true,
    },
  }

  const createContext = (jobFilter: JobFilter = {}): TelegramContextType => {
    return {
      session: {
        jobFilter,
      },
      reply: mocks.reply,
      editMessageText: mocks.editMessageText,
    } as unknown as TelegramContextType
  }

  beforeEach(() => {
    vi.resetAllMocks()

    const jobService = {
      getJobs: mocks.getJobs,
      count: mocks.count,
    } as unknown as IJobService

    mocks.getJobs.mockResolvedValue(jobs)
    mocks.count.mockResolvedValue(PAGINATION_LIMIT * 3)

    mocks.formatList.mockReturnValue(formattedMessage)

    mocks.createFilterKeyboard.mockReturnValue(filterKeyboard)
    mocks.createListKeyboard.mockReturnValue(listKeyboard)
    mocks.createPaginationKeyboard.mockReturnValue(paginationKeyboard)

    context = createContext()
    renderer = new JobRenderer(jobService)
  })

  describe('render', () => {
    it('should render jobs using the default page', async () => {
      await renderer.render(context)

      expect(mocks.getJobs).toHaveBeenCalledWith(1, PAGINATION_LIMIT, {})

      expect(mocks.count).toHaveBeenCalledWith({})

      expect(mocks.formatList).toHaveBeenCalledWith(jobs, 1, 3)

      expect(mocks.reply).toHaveBeenCalledWith(formattedMessage, messageOptions)

      expect(mocks.editMessageText).not.toHaveBeenCalled()
    })

    it('should render jobs using the specified page', async () => {
      await renderer.render(context, 2)

      expect(mocks.getJobs).toHaveBeenCalledWith(2, PAGINATION_LIMIT, {})

      expect(mocks.formatList).toHaveBeenCalledWith(jobs, 2, 3)
    })

    it('should pass selected filters to the job service', async () => {
      const jobFilter: JobFilter = {
        contractType,
        provider,
      }

      context = createContext(jobFilter)

      await renderer.render(context, 2)

      expect(mocks.getJobs).toHaveBeenCalledWith(2, PAGINATION_LIMIT, jobFilter)

      expect(mocks.count).toHaveBeenCalledWith(jobFilter)
    })

    it('should reply when no jobs are found', async () => {
      mocks.getJobs.mockResolvedValue([])

      await renderer.render(context)

      expect(mocks.reply).toHaveBeenCalledTimes(1)

      expect(mocks.reply).toHaveBeenCalledWith('متاسفانه شغلی یافت نشد!')

      expect(mocks.count).not.toHaveBeenCalled()
      expect(mocks.formatList).not.toHaveBeenCalled()
      expect(mocks.createFilterKeyboard).not.toHaveBeenCalled()
      expect(mocks.createListKeyboard).not.toHaveBeenCalled()
      expect(mocks.createPaginationKeyboard).not.toHaveBeenCalled()
      expect(mocks.editMessageText).not.toHaveBeenCalled()
    })

    it('should reply when no jobs are found in edit mode', async () => {
      mocks.getJobs.mockResolvedValue([])

      await renderer.render(context, 1, true)

      expect(mocks.reply).toHaveBeenCalledWith('متاسفانه شغلی یافت نشد!')

      expect(mocks.editMessageText).not.toHaveBeenCalled()
    })

    it('should edit the existing message when edit is true', async () => {
      await renderer.render(context, 2, true)

      expect(mocks.editMessageText).toHaveBeenCalledTimes(1)

      expect(mocks.editMessageText).toHaveBeenCalledWith(formattedMessage, messageOptions)

      expect(mocks.reply).not.toHaveBeenCalled()
    })
  })

  describe('pagination', () => {
    it.each([
      [1, 1],
      [PAGINATION_LIMIT, 1],
      [PAGINATION_LIMIT + 1, 2],
      [PAGINATION_LIMIT * 2, 2],
      [PAGINATION_LIMIT * 2 + 1, 3],
    ])('should calculate %i jobs as %i pages', async (totalJobs, expectedPages) => {
      mocks.count.mockResolvedValue(totalJobs)

      await renderer.render(context)

      expect(mocks.createPaginationKeyboard).toHaveBeenCalledWith(1, expectedPages)

      expect(mocks.formatList).toHaveBeenCalledWith(jobs, 1, expectedPages)
    })
  })

  describe('keyboards', () => {
    it('should create and append all keyboards', async () => {
      await renderer.render(context, 2)

      expect(mocks.createFilterKeyboard).toHaveBeenCalledWith(2)

      expect(mocks.createListKeyboard).toHaveBeenCalledWith(jobs, 2)

      expect(mocks.createPaginationKeyboard).toHaveBeenCalledWith(2, 3)

      expect(mocks.append).toHaveBeenCalledTimes(2)

      expect(mocks.append).toHaveBeenNthCalledWith(1, listKeyboard)

      expect(mocks.append).toHaveBeenNthCalledWith(2, paginationKeyboard)
    })
  })

  describe('filters', () => {
    it('should not include filter information when filters are empty', async () => {
      await renderer.render(context)

      expect(mocks.reply).toHaveBeenCalledWith(formattedMessage, messageOptions)
    })

    it('should include the selected contract type', async () => {
      context = createContext({ contractType })

      await renderer.render(context)

      const message = mocks.reply.mock.calls[0]?.[0]

      expect(message).toContain('فیلترهای انتخاب شده:')

      expect(message).toContain(`نوع قرارداد: <b>${CONTRACT_TYPE_MAP[contractType]}</b>`)

      expect(message).not.toContain('منبع:')
    })

    it('should include the selected provider', async () => {
      context = createContext({ provider })

      await renderer.render(context)

      const message = mocks.reply.mock.calls[0]?.[0]

      expect(message).toContain('فیلترهای انتخاب شده:')

      expect(message).toContain(`منبع: <b>${PROVIDER_MAP[provider]}</b>`)

      expect(message).not.toContain('نوع قرارداد:')
    })

    it('should prepend all selected filters to the job list', async () => {
      context = createContext({
        contractType,
        provider,
      })

      await renderer.render(context)

      const message = mocks.reply.mock.calls[0]?.[0]

      const expectedMessage = [
        'فیلترهای انتخاب شده:',
        `نوع قرارداد: <b>${CONTRACT_TYPE_MAP[contractType]}</b>`,
        `منبع: <b>${PROVIDER_MAP[provider]}</b>`,
        formattedMessage,
      ].join(' ')

      expect(message?.replace(/\s+/g, ' ').trim()).toBe(expectedMessage.replace(/\s+/g, ' ').trim())
    })

    it('should include filters when editing a message', async () => {
      context = createContext({ provider })

      await renderer.render(context, 2, true)

      expect(mocks.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining(`منبع: <b>${PROVIDER_MAP[provider]}</b>`),
        messageOptions,
      )

      expect(mocks.reply).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should propagate errors from getJobs', async () => {
      const error = new Error('Failed to fetch jobs')

      mocks.getJobs.mockRejectedValue(error)

      await expect(renderer.render(context)).rejects.toBe(error)

      expect(mocks.count).not.toHaveBeenCalled()
      expect(mocks.reply).not.toHaveBeenCalled()
      expect(mocks.editMessageText).not.toHaveBeenCalled()
    })

    it('should propagate errors from count', async () => {
      const error = new Error('Failed to count jobs')

      mocks.count.mockRejectedValue(error)

      await expect(renderer.render(context)).rejects.toBe(error)

      expect(mocks.formatList).not.toHaveBeenCalled()
      expect(mocks.reply).not.toHaveBeenCalled()
    })

    it('should propagate errors from the formatter', async () => {
      const error = new Error('Failed to format jobs')

      mocks.formatList.mockImplementation(() => {
        throw error
      })

      await expect(renderer.render(context)).rejects.toBe(error)

      expect(mocks.reply).not.toHaveBeenCalled()
      expect(mocks.editMessageText).not.toHaveBeenCalled()
    })

    it('should propagate errors from reply', async () => {
      const error = new Error('Failed to send message')

      mocks.reply.mockRejectedValue(error)

      await expect(renderer.render(context)).rejects.toBe(error)
    })

    it('should propagate errors from editMessageText', async () => {
      const error = new Error('Failed to edit message')

      mocks.editMessageText.mockRejectedValue(error)

      await expect(renderer.render(context, 1, true)).rejects.toBe(error)
    })
  })
})
