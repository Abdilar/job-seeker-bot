import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EContractType, EProvider, type IJobFilter } from '../../../../types'
import type { IJobRenderer } from '../../../renders'
import type { TelegramContextType } from '../../../telegram.model'
import { JobFilterHandler } from '.'

type Handler = (context: TelegramContextType) => Promise<void> | void

describe('JobFilterHandler', () => {
  const renderMock = vi.fn<IJobRenderer['render']>()

  const jobRenderer = {
    render: renderMock,
  } as IJobRenderer

  const callbackQueryMock = vi.fn<(trigger: RegExp, handler: Handler) => void>()

  const bot = {
    callbackQuery: callbackQueryMock,
  }

  const createContext = (match: string[], jobFilter: IJobFilter = {}) => {
    const answerCallbackQueryMock = vi.fn()
    const editMessageTextMock = vi.fn()

    const context = {
      match,
      session: {
        jobFilter,
      },
      answerCallbackQuery: answerCallbackQueryMock,
      editMessageText: editMessageTextMock,
    } as unknown as TelegramContextType

    return {
      context,
      answerCallbackQueryMock,
      editMessageTextMock,
    }
  }

  const registerHandler = (): void => {
    new JobFilterHandler(jobRenderer).register(bot as never)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers all filter callbacks', () => {
    registerHandler()

    expect(callbackQueryMock).toHaveBeenCalledTimes(4)

    expect(callbackQueryMock).toHaveBeenNthCalledWith(1, /^filters:(\d+)$/, expect.any(Function))

    expect(callbackQueryMock).toHaveBeenNthCalledWith(2, /^filters:clear$/, expect.any(Function))

    expect(callbackQueryMock).toHaveBeenNthCalledWith(
      3,
      /^filters:contractType:(.+)$/,
      expect.any(Function),
    )

    expect(callbackQueryMock).toHaveBeenNthCalledWith(
      4,
      /^filters:provider:(.+)$/,
      expect.any(Function),
    )
  })

  it('shows filter menu', async () => {
    registerHandler()

    const handler = callbackQueryMock.mock.calls[0][1]

    const { context, answerCallbackQueryMock, editMessageTextMock } = createContext([
      'filters:3',
      '3',
    ])

    await handler(context)

    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()
    expect(editMessageTextMock).toHaveBeenCalledOnce()
  })

  it('clears all filters and renders first page', async () => {
    registerHandler()

    const handler = callbackQueryMock.mock.calls[1][1]

    const { context, answerCallbackQueryMock } = createContext(['filters:clear'], {
      contractType: EContractType.FULL_TIME,
      provider: EProvider.JOB_IN_JA,
    })

    await handler(context)

    expect(context.session.jobFilter).toEqual({})
    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()
    expect(renderMock).toHaveBeenCalledWith(context, 1, true)
  })

  it('shows contract type filter', async () => {
    registerHandler()

    const handler = callbackQueryMock.mock.calls[2][1]

    const { context, answerCallbackQueryMock, editMessageTextMock } = createContext([
      'filters:contractType:3',
      '3',
    ])

    await handler(context)

    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()
    expect(editMessageTextMock).toHaveBeenCalledOnce()
  })

  it('selects contract type', async () => {
    registerHandler()

    const handler = callbackQueryMock.mock.calls[2][1]

    const { context, answerCallbackQueryMock } = createContext([
      `filters:contractType:${EContractType.FULL_TIME}`,
      EContractType.FULL_TIME,
    ])

    await handler(context)

    expect(context.session.jobFilter.contractType).toBe(EContractType.FULL_TIME)

    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()
    expect(renderMock).toHaveBeenCalledWith(context, 1, true)
  })

  it('clears contract type filter', async () => {
    registerHandler()

    const handler = callbackQueryMock.mock.calls[2][1]

    const { context, answerCallbackQueryMock } = createContext(
      ['filters:contractType:clear', 'clear'],
      {
        contractType: EContractType.FULL_TIME,
        provider: EProvider.JOB_IN_JA,
      },
    )

    await handler(context)

    expect(context.session.jobFilter).toEqual({
      provider: EProvider.JOB_IN_JA,
    })

    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()
    expect(renderMock).toHaveBeenCalledWith(context, 1, true)
  })

  it('shows provider filter', async () => {
    registerHandler()

    const handler = callbackQueryMock.mock.calls[3][1]

    const { context, answerCallbackQueryMock, editMessageTextMock } = createContext([
      'filters:provider:2',
      '2',
    ])

    await handler(context)

    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()
    expect(editMessageTextMock).toHaveBeenCalledOnce()
  })

  it('selects provider', async () => {
    registerHandler()

    const handler = callbackQueryMock.mock.calls[3][1]

    const { context, answerCallbackQueryMock } = createContext([
      `filters:provider:${EProvider.JOB_IN_JA}`,
      EProvider.JOB_IN_JA,
    ])

    await handler(context)

    expect(context.session.jobFilter.provider).toBe(EProvider.JOB_IN_JA)

    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()
    expect(renderMock).toHaveBeenCalledWith(context, 1, true)
  })

  it('clears provider filter', async () => {
    registerHandler()

    const handler = callbackQueryMock.mock.calls[3][1]

    const { context, answerCallbackQueryMock } = createContext(
      ['filters:provider:clear', 'clear'],
      {
        contractType: EContractType.FULL_TIME,
        provider: EProvider.JOB_IN_JA,
      },
    )

    await handler(context)

    expect(context.session.jobFilter).toEqual({
      contractType: EContractType.FULL_TIME,
    })

    expect(answerCallbackQueryMock).toHaveBeenCalledOnce()
    expect(renderMock).toHaveBeenCalledWith(context, 1, true)
  })
})
