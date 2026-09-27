import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IJobService } from '../../../services'
import { EContractType, EProvider, type IJob } from '../../../types'
import type { IJobRenderer } from '../../renders'
import type { TelegramContextType } from '../../telegram.model'
import { JobHandler } from './job.handler'

type Handler = (context: TelegramContextType) => Promise<void> | void

describe('JobHandler', () => {
  const getJobMock = vi.fn<IJobService['getJob']>()
  const renderMock = vi.fn<IJobRenderer['render']>()

  const jobService = {
    getJob: getJobMock,
  } as unknown as IJobService

  const jobRenderer = {
    render: renderMock,
  } as IJobRenderer

  const commandMock = vi.fn<(command: string, handler: Handler) => void>()

  const callbackQueryMock = vi.fn<(trigger: RegExp, handler: Handler) => void>()

  const bot = {
    command: commandMock,
    callbackQuery: callbackQueryMock,
  }

  const job: IJob = {
    id: 'job-1',
    title: 'Senior Frontend Engineer',
    url: 'https://example.com/jobs/1',
    contractType: EContractType.FULL_TIME,
    provider: EProvider.JOB_IN_JA,
    salary: '100M',
    postedAt: new Date('2026-09-20'),
    company: {
      fullName: 'Example Company',
    },
    location: {
      country: 'Iran',
      province: 'Tehran',
    },
  }

  const createContext = (overrides: Partial<TelegramContextType> = {}): TelegramContextType =>
    ({
      ...overrides,
    }) as TelegramContextType

  const registerHandler = (): void => {
    const handler = new JobHandler(jobService, jobRenderer)

    handler.register(bot as never)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers jobs command and callback queries', () => {
    registerHandler()

    expect(commandMock).toHaveBeenCalledWith('jobs', expect.any(Function))

    expect(callbackQueryMock).toHaveBeenCalledTimes(2)

    expect(callbackQueryMock).toHaveBeenNthCalledWith(
      1,
      /^jobs:([^:]+):(\d+)$/,
      expect.any(Function),
    )

    expect(callbackQueryMock).toHaveBeenNthCalledWith(2, /^jobs:(\d+)$/, expect.any(Function))
  })

  it('renders jobs when jobs command is called', async () => {
    registerHandler()

    const commandHandler = commandMock.mock.calls[0][1]
    const context = createContext()

    await commandHandler(context)

    expect(renderMock).toHaveBeenCalledWith(context)
  })

  it('shows job details', async () => {
    getJobMock.mockResolvedValue(job)

    registerHandler()

    const detailsHandler = callbackQueryMock.mock.calls[0][1]

    const answerCallbackQueryMock = vi.fn()
    const editMessageTextMock = vi.fn()

    const context = createContext({
      match: ['jobs:job-1:3', 'job-1', '3'],
      answerCallbackQuery: answerCallbackQueryMock,
      editMessageText: editMessageTextMock,
    })

    await detailsHandler(context)

    expect(getJobMock).toHaveBeenCalledWith('job-1')
    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()

    expect(editMessageTextMock).toHaveBeenCalledOnce()

    expect(editMessageTextMock).toHaveBeenCalledWith(
      expect.stringContaining('Senior Frontend Engineer'),
      expect.anything(),
    )
  })

  it('answers callback query when job does not exist', async () => {
    getJobMock.mockResolvedValue(null)

    registerHandler()

    const detailsHandler = callbackQueryMock.mock.calls[0][1]

    const answerCallbackQueryMock = vi.fn()
    const editMessageTextMock = vi.fn()

    const context = createContext({
      match: ['jobs:missing:2', 'missing', '2'],
      answerCallbackQuery: answerCallbackQueryMock,
      editMessageText: editMessageTextMock,
    })

    await detailsHandler(context)

    expect(getJobMock).toHaveBeenCalledWith('missing')

    expect(answerCallbackQueryMock).toHaveBeenCalledWith({
      text: 'این موقعیت شغلی پیدا نشد.',
    })

    expect(editMessageTextMock).not.toHaveBeenCalled()
  })

  it('does nothing when job id is missing', async () => {
    registerHandler()

    const detailsHandler = callbackQueryMock.mock.calls[0][1]

    const answerCallbackQueryMock = vi.fn()
    const editMessageTextMock = vi.fn()

    const context = createContext({
      match: undefined,
      answerCallbackQuery: answerCallbackQueryMock,
      editMessageText: editMessageTextMock,
    })

    await detailsHandler(context)

    expect(getJobMock).not.toHaveBeenCalled()
    expect(answerCallbackQueryMock).not.toHaveBeenCalled()
    expect(editMessageTextMock).not.toHaveBeenCalled()
  })

  it('renders requested jobs page when pagination callback is called', async () => {
    registerHandler()

    const paginationHandler = callbackQueryMock.mock.calls[1][1]

    const answerCallbackQueryMock = vi.fn()

    const context = createContext({
      match: ['jobs:4', '4'],
      answerCallbackQuery: answerCallbackQueryMock,
    })

    await paginationHandler(context)

    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()

    expect(renderMock).toHaveBeenCalledWith(context, 4, true)
  })
})
