import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { IJobService } from '../../../services'
import { CONTRACT_TYPE_MAP, PAGINATION_LIMIT, PROVIDER_MAP } from '../../constants'
import type { TelegramContextType } from '../../telegram.model'

import { JobRenderer } from './job.render'

type JobFilter = TelegramContextType['session']['jobFilter']

const mocks = vi.hoisted(() => ({
  getJobs: vi.fn<IJobService['getJobs']>(),
  count: vi.fn<IJobService['count']>(),

  reply: vi.fn(),
  editMessageText: vi.fn(),

  formatList: vi.fn(),

  createFilterKeyboard: vi.fn(),
  createListKeyboard: vi.fn(),
  createPaginationKeyboard: vi.fn(),

  appendKeyboard: vi.fn(),
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
  let jobService: IJobService

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
    append: mocks.appendKeyboard,
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

    jobService = {
      getJobs: mocks.getJobs,
      count: mocks.count,
    } as unknown as IJobService

    context = createContext()

    mocks.getJobs.mockResolvedValue(jobs)
    mocks.count.mockResolvedValue(PAGINATION_LIMIT * 3)

    mocks.formatList.mockReturnValue(formattedMessage)

    mocks.createFilterKeyboard.mockReturnValue(filterKeyboard)
    mocks.createListKeyboard.mockReturnValue(listKeyboard)
    mocks.createPaginationKeyboard.mockReturnValue(paginationKeyboard)

    renderer = new JobRenderer(jobService)
  })

  describe('render - fetching jobs', () => {
    it('should fetch jobs using the default page', async () => {
      await renderer.render(context)

      expect(mocks.getJobs).toHaveBeenCalledExactlyOnceWith(1, PAGINATION_LIMIT, {})
    })

    it('should fetch jobs using the specified page', async () => {
      await renderer.render(context, 2)

      expect(mocks.getJobs).toHaveBeenCalledExactlyOnceWith(2, PAGINATION_LIMIT, {})
    })

    it('should fetch jobs using the selected filters', async () => {
      const jobFilter: JobFilter = {
        contractType,
        provider,
      }

      context = createContext(jobFilter)

      await renderer.render(context, 2)

      expect(mocks.getJobs).toHaveBeenCalledExactlyOnceWith(2, PAGINATION_LIMIT, jobFilter)

      expect(mocks.count).toHaveBeenCalledExactlyOnceWith(jobFilter)
    })

    it('should count jobs using the session filters', async () => {
      await renderer.render(context)

      expect(mocks.count).toHaveBeenCalledExactlyOnceWith(context.session.jobFilter)
    })
  })

  describe('render - empty jobs', () => {
    it('should reply with a message when no jobs are found', async () => {
      mocks.getJobs.mockResolvedValue([])

      await renderer.render(context)

      expect(mocks.reply).toHaveBeenCalledExactlyOnceWith('متاسفانه شغلی یافت نشد!')
    })

    it('should not count jobs when no jobs are found', async () => {
      mocks.getJobs.mockResolvedValue([])

      await renderer.render(context)

      expect(mocks.count).not.toHaveBeenCalled()
    })

    it('should not create keyboards when no jobs are found', async () => {
      mocks.getJobs.mockResolvedValue([])

      await renderer.render(context)

      expect(mocks.createFilterKeyboard).not.toHaveBeenCalled()
      expect(mocks.createListKeyboard).not.toHaveBeenCalled()
      expect(mocks.createPaginationKeyboard).not.toHaveBeenCalled()
      expect(mocks.appendKeyboard).not.toHaveBeenCalled()
    })

    it('should not format the message when no jobs are found', async () => {
      mocks.getJobs.mockResolvedValue([])

      await renderer.render(context)

      expect(mocks.formatList).not.toHaveBeenCalled()
    })

    it('should reply instead of editing when no jobs are found', async () => {
      mocks.getJobs.mockResolvedValue([])

      await renderer.render(context, 1, true)

      expect(mocks.reply).toHaveBeenCalledExactlyOnceWith('متاسفانه شغلی یافت نشد!')

      expect(mocks.editMessageText).not.toHaveBeenCalled()
    })
  })

  describe('render - pagination', () => {
    it.each([
      [1, 1],
      [PAGINATION_LIMIT, 1],
      [PAGINATION_LIMIT + 1, 2],
      [PAGINATION_LIMIT * 2, 2],
      [PAGINATION_LIMIT * 2 + 1, 3],
      [PAGINATION_LIMIT * 5, 5],
    ])('should calculate %i total jobs as %i pages', async (totalJobs, expectedPages) => {
      mocks.count.mockResolvedValue(totalJobs)

      await renderer.render(context)

      expect(mocks.createPaginationKeyboard).toHaveBeenCalledExactlyOnceWith(1, expectedPages)

      expect(mocks.formatList).toHaveBeenCalledExactlyOnceWith(jobs, 1, expectedPages)
    })
  })

  describe('render - keyboards', () => {
    it('should create the job filter keyboard', async () => {
      await renderer.render(context, 2)

      expect(mocks.createFilterKeyboard).toHaveBeenCalledExactlyOnceWith(2)
    })

    it('should create the job list keyboard', async () => {
      await renderer.render(context, 2)

      expect(mocks.createListKeyboard).toHaveBeenCalledExactlyOnceWith(jobs, 2)
    })

    it('should create the pagination keyboard', async () => {
      await renderer.render(context, 2)

      expect(mocks.createPaginationKeyboard).toHaveBeenCalledExactlyOnceWith(2, 3)
    })

    it('should append list and pagination keyboards in order', async () => {
      await renderer.render(context)

      expect(mocks.appendKeyboard).toHaveBeenCalledTimes(2)

      expect(mocks.appendKeyboard).toHaveBeenNthCalledWith(1, listKeyboard)

      expect(mocks.appendKeyboard).toHaveBeenNthCalledWith(2, paginationKeyboard)
    })
  })

  describe('render - formatting', () => {
    it('should format the job list', async () => {
      await renderer.render(context, 2)

      expect(mocks.formatList).toHaveBeenCalledExactlyOnceWith(jobs, 2, 3)
    })

    it('should not include filter information when filters are empty', async () => {
      await renderer.render(context)

      expect(mocks.reply).toHaveBeenCalledWith(formattedMessage, expect.any(Object))
    })

    it('should include the selected contract type', async () => {
      context = createContext({
        contractType,
      })

      await renderer.render(context)

      expect(mocks.reply).toHaveBeenCalledWith(
        expect.stringContaining(`نوع قرارداد: <b>${CONTRACT_TYPE_MAP[contractType]}</b>`),
        expect.any(Object),
      )

      expect(mocks.reply).not.toHaveBeenCalledWith(
        expect.stringContaining('منبع:'),
        expect.any(Object),
      )
    })

    it('should include the selected provider', async () => {
      context = createContext({
        provider,
      })

      await renderer.render(context)

      expect(mocks.reply).toHaveBeenCalledWith(
        expect.stringContaining(`منبع: <b>${PROVIDER_MAP[provider]}</b>`),
        expect.any(Object),
      )

      expect(mocks.reply).not.toHaveBeenCalledWith(
        expect.stringContaining('نوع قرارداد:'),
        expect.any(Object),
      )
    })

    it('should include all selected filters', async () => {
      context = createContext({
        contractType,
        provider,
      })

      await renderer.render(context)

      expect(mocks.reply).toHaveBeenCalledWith(
        expect.stringContaining('فیلترهای انتخاب شده:'),
        expect.any(Object),
      )

      expect(mocks.reply).toHaveBeenCalledWith(
        expect.stringContaining(`نوع قرارداد: <b>${CONTRACT_TYPE_MAP[contractType]}</b>`),
        expect.any(Object),
      )

      expect(mocks.reply).toHaveBeenCalledWith(
        expect.stringContaining(`منبع: <b>${PROVIDER_MAP[provider]}</b>`),
        expect.any(Object),
      )
    })

    it('should prepend filter information to the formatted job list', async () => {
      context = createContext({
        contractType,
        provider,
      })

      await renderer.render(context)

      const expectedMessage =
        'فیلترهای انتخاب شده:\n' +
        `\nنوع قرارداد: <b>${CONTRACT_TYPE_MAP[contractType]}</b>\n        ` +
        `\nمنبع: <b>${PROVIDER_MAP[provider]}</b>\n` +
        formattedMessage

      expect(mocks.reply).toHaveBeenCalledWith(expectedMessage, expect.any(Object))
    })
  })

  describe('render - sending messages', () => {
    it('should send a new message by default', async () => {
      await renderer.render(context)

      expect(mocks.reply).toHaveBeenCalledExactlyOnceWith(formattedMessage, {
        reply_markup: filterKeyboard,
        parse_mode: 'HTML',
        link_preview_options: {
          is_disabled: true,
        },
      })

      expect(mocks.editMessageText).not.toHaveBeenCalled()
    })

    it('should send a new message when edit is false', async () => {
      await renderer.render(context, 1, false)

      expect(mocks.reply).toHaveBeenCalledTimes(1)
      expect(mocks.editMessageText).not.toHaveBeenCalled()
    })

    it('should edit the existing message when edit is true', async () => {
      await renderer.render(context, 1, true)

      expect(mocks.editMessageText).toHaveBeenCalledExactlyOnceWith(formattedMessage, {
        reply_markup: filterKeyboard,
        parse_mode: 'HTML',
        link_preview_options: {
          is_disabled: true,
        },
      })

      expect(mocks.reply).not.toHaveBeenCalled()
    })

    it('should include selected filters when editing a message', async () => {
      context = createContext({
        provider,
      })

      await renderer.render(context, 2, true)

      expect(mocks.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining(`منبع: <b>${PROVIDER_MAP[provider]}</b>`),
        expect.any(Object),
      )

      expect(mocks.reply).not.toHaveBeenCalled()
    })
  })

  describe('render - error handling', () => {
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
