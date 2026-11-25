import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Bot } from 'grammy'
import type { IJobService } from '../../../services'
import type { IJob } from '../../../types'
import type { IJobRenderer } from '../../renders'
import type { TelegramContextType } from '../../telegram.model'
import { JobHandler } from './job.handler'

type Handler = (context: TelegramContextType) => Promise<void>

const mocks = vi.hoisted(() => ({
  command: vi.fn(),
  callbackQuery: vi.fn(),

  getJob: vi.fn<IJobService['getJob']>(),
  render: vi.fn<IJobRenderer['render']>(),

  formatDetail: vi.fn(),
  createDetailsKeyboard: vi.fn(),

  answerCallbackQuery: vi.fn<TelegramContextType['answerCallbackQuery']>(),

  editMessageText: vi.fn<TelegramContextType['editMessageText']>(),
}))

vi.mock('../../formatters', () => ({
  JobFormatter: class {
    formatDetail = mocks.formatDetail
  },
}))

vi.mock('../../keyboards', () => ({
  JobDetailsKeyboard: class {
    create = mocks.createDetailsKeyboard
  },
}))

describe('JobHandler', () => {
  let handler: JobHandler
  let bot: Bot<TelegramContextType>

  const job = {
    id: 'job-1',
    title: 'Frontend Developer',
    url: 'https://example.com/jobs/job-1',
  } as IJob

  const formattedMessage = 'Formatted job details'

  const detailsKeyboard = {
    inline_keyboard: [],
  }

  const messageOptions = {
    parse_mode: 'HTML',
    reply_markup: detailsKeyboard,
    link_preview_options: {
      is_disabled: true,
    },
  }

  const createContext = (match?: RegExpMatchArray): TelegramContextType => {
    return {
      match,
      answerCallbackQuery: mocks.answerCallbackQuery,
      editMessageText: mocks.editMessageText,
    } as unknown as TelegramContextType
  }

  const getCommandHandler = (): Handler => {
    return mocks.command.mock.calls[0][1] as Handler
  }

  const getDetailsHandler = (): Handler => {
    return mocks.callbackQuery.mock.calls[0][1] as Handler
  }

  const getPaginationHandler = (): Handler => {
    return mocks.callbackQuery.mock.calls[1][1] as Handler
  }

  beforeEach(() => {
    vi.resetAllMocks()

    const jobService = {
      getJob: mocks.getJob,
    } as unknown as IJobService

    const jobRenderer: IJobRenderer = {
      render: mocks.render,
    }

    bot = {
      command: mocks.command,
      callbackQuery: mocks.callbackQuery,
    } as unknown as Bot<TelegramContextType>

    mocks.getJob.mockResolvedValue(job)
    mocks.render.mockResolvedValue(undefined)

    mocks.formatDetail.mockReturnValue(formattedMessage)
    mocks.createDetailsKeyboard.mockReturnValue(detailsKeyboard)

    handler = new JobHandler(jobService, jobRenderer)

    handler.register(bot)
  })

  describe('register', () => {
    it('should register the jobs command', () => {
      expect(mocks.command).toHaveBeenCalledTimes(1)

      expect(mocks.command).toHaveBeenCalledWith('jobs', expect.any(Function))
    })

    it('should register the job details callback query', () => {
      expect(mocks.callbackQuery).toHaveBeenCalledWith(/^jobs:([^:]+):(\d+)$/, expect.any(Function))
    })

    it('should register the pagination callback query', () => {
      expect(mocks.callbackQuery).toHaveBeenCalledWith(/^jobs:(\d+)$/, expect.any(Function))
    })

    it('should register exactly two callback queries', () => {
      expect(mocks.callbackQuery).toHaveBeenCalledTimes(2)
    })
  })

  describe('jobs command', () => {
    it('should render the job list', async () => {
      const context = createContext()

      await getCommandHandler()(context)

      expect(mocks.render).toHaveBeenCalledTimes(1)

      expect(mocks.render).toHaveBeenCalledWith(context)
    })

    it('should propagate renderer errors', async () => {
      const context = createContext()
      const error = new Error('Failed to render jobs')

      mocks.render.mockRejectedValue(error)

      await expect(getCommandHandler()(context)).rejects.toBe(error)
    })
  })

  describe('handleDetails', () => {
    it('should fetch a job using the extracted job ID', async () => {
      const context = createContext('jobs:job-1:2'.match(/^jobs:([^:]+):(\d+)$/)!)

      await getDetailsHandler()(context)

      expect(mocks.getJob).toHaveBeenCalledTimes(1)
      expect(mocks.getJob).toHaveBeenCalledWith('job-1')
    })

    it('should return early when the job ID is missing', async () => {
      const context = createContext()

      await getDetailsHandler()(context)

      expect(mocks.getJob).not.toHaveBeenCalled()
      expect(mocks.formatDetail).not.toHaveBeenCalled()
      expect(mocks.createDetailsKeyboard).not.toHaveBeenCalled()
      expect(mocks.answerCallbackQuery).not.toHaveBeenCalled()
      expect(mocks.editMessageText).not.toHaveBeenCalled()
    })

    it('should answer the callback query when the job is not found', async () => {
      mocks.getJob.mockResolvedValue(null)

      const context = createContext('jobs:job-1:2'.match(/^jobs:([^:]+):(\d+)$/)!)

      await getDetailsHandler()(context)

      expect(mocks.answerCallbackQuery).toHaveBeenCalledTimes(1)

      expect(mocks.answerCallbackQuery).toHaveBeenCalledWith({
        text: 'این موقعیت شغلی پیدا نشد.',
      })

      expect(mocks.formatDetail).not.toHaveBeenCalled()
      expect(mocks.createDetailsKeyboard).not.toHaveBeenCalled()
      expect(mocks.editMessageText).not.toHaveBeenCalled()
    })

    it('should format the job details', async () => {
      const context = createContext('jobs:job-1:2'.match(/^jobs:([^:]+):(\d+)$/)!)

      await getDetailsHandler()(context)

      expect(mocks.formatDetail).toHaveBeenCalledTimes(1)
      expect(mocks.formatDetail).toHaveBeenCalledWith(job)
    })

    it('should create the details keyboard using the job URL and page', async () => {
      const context = createContext('jobs:job-1:3'.match(/^jobs:([^:]+):(\d+)$/)!)

      await getDetailsHandler()(context)

      expect(mocks.createDetailsKeyboard).toHaveBeenCalledWith(job.url, 3)
    })

    it('should answer the callback query', async () => {
      const context = createContext('jobs:job-1:2'.match(/^jobs:([^:]+):(\d+)$/)!)

      await getDetailsHandler()(context)

      expect(mocks.answerCallbackQuery).toHaveBeenCalledTimes(1)
      expect(mocks.answerCallbackQuery).toHaveBeenCalledWith()
    })

    it('should edit the message with formatted job details', async () => {
      const context = createContext('jobs:job-1:2'.match(/^jobs:([^:]+):(\d+)$/)!)

      await getDetailsHandler()(context)

      expect(mocks.editMessageText).toHaveBeenCalledTimes(1)

      expect(mocks.editMessageText).toHaveBeenCalledWith(formattedMessage, messageOptions)
    })

    it('should answer the callback query before editing the message', async () => {
      const context = createContext('jobs:job-1:2'.match(/^jobs:([^:]+):(\d+)$/)!)

      await getDetailsHandler()(context)

      expect(mocks.answerCallbackQuery.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.editMessageText.mock.invocationCallOrder[0],
      )
    })

    it.each([1, 2, 5, 10])(
      'should preserve page %i when creating the details keyboard',
      async (page) => {
        const context = createContext(`jobs:job-1:${page}`.match(/^jobs:([^:]+):(\d+)$/)!)

        await getDetailsHandler()(context)

        expect(mocks.createDetailsKeyboard).toHaveBeenCalledWith(job.url, page)
      },
    )

    it('should propagate errors from the job service', async () => {
      const error = new Error('Failed to fetch job')

      mocks.getJob.mockRejectedValue(error)

      const context = createContext('jobs:job-1:2'.match(/^jobs:([^:]+):(\d+)$/)!)

      await expect(getDetailsHandler()(context)).rejects.toBe(error)

      expect(mocks.formatDetail).not.toHaveBeenCalled()
      expect(mocks.editMessageText).not.toHaveBeenCalled()
    })

    it('should propagate errors from the formatter', async () => {
      const error = new Error('Failed to format job')

      mocks.formatDetail.mockImplementation(() => {
        throw error
      })

      const context = createContext('jobs:job-1:2'.match(/^jobs:([^:]+):(\d+)$/)!)

      await expect(getDetailsHandler()(context)).rejects.toBe(error)

      expect(mocks.editMessageText).not.toHaveBeenCalled()
    })

    it('should propagate errors from editMessageText', async () => {
      const error = new Error('Failed to edit message')

      mocks.editMessageText.mockRejectedValue(error)

      const context = createContext('jobs:job-1:2'.match(/^jobs:([^:]+):(\d+)$/)!)

      await expect(getDetailsHandler()(context)).rejects.toBe(error)
    })
  })

  describe('showJobs', () => {
    it('should answer the callback query', async () => {
      const context = createContext('jobs:2'.match(/^jobs:(\d+)$/)!)

      await getPaginationHandler()(context)

      expect(mocks.answerCallbackQuery).toHaveBeenCalledTimes(1)
      expect(mocks.answerCallbackQuery).toHaveBeenCalledWith()
    })

    it('should render the requested page in edit mode', async () => {
      const context = createContext('jobs:3'.match(/^jobs:(\d+)$/)!)

      await getPaginationHandler()(context)

      expect(mocks.render).toHaveBeenCalledTimes(1)

      expect(mocks.render).toHaveBeenCalledWith(context, 3, true)
    })

    it.each([1, 2, 5, 10])('should render page %i', async (page) => {
      const context = createContext(`jobs:${page}`.match(/^jobs:(\d+)$/)!)

      await getPaginationHandler()(context)

      expect(mocks.render).toHaveBeenCalledWith(context, page, true)
    })

    it('should answer the callback query before rendering', async () => {
      const context = createContext('jobs:2'.match(/^jobs:(\d+)$/)!)

      await getPaginationHandler()(context)

      expect(mocks.answerCallbackQuery.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.render.mock.invocationCallOrder[0],
      )
    })

    it('should not render when answering the callback query fails', async () => {
      const error = new Error('Failed to answer callback')

      mocks.answerCallbackQuery.mockRejectedValue(error)

      const context = createContext('jobs:2'.match(/^jobs:(\d+)$/)!)

      await expect(getPaginationHandler()(context)).rejects.toBe(error)

      expect(mocks.render).not.toHaveBeenCalled()
    })

    it('should propagate errors from the renderer', async () => {
      const error = new Error('Failed to render jobs')

      mocks.render.mockRejectedValue(error)

      const context = createContext('jobs:2'.match(/^jobs:(\d+)$/)!)

      await expect(getPaginationHandler()(context)).rejects.toBe(error)
    })
  })
})
