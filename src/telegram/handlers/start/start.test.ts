import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TelegramContextType } from '../../telegram.model'
import { StartHandler } from './start.handler'

type Handler = (context: TelegramContextType) => Promise<void> | void

describe('StartHandler', () => {
  const commandMock = vi.fn<(command: string, handler: Handler) => void>()

  const bot = {
    command: commandMock,
  }

  const createContext = () => {
    const replyMock = vi.fn()

    const context = {
      reply: replyMock,
    } as unknown as TelegramContextType

    return {
      context,
      replyMock,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers start command', () => {
    const handler = new StartHandler()

    handler.register(bot as never)

    expect(commandMock).toHaveBeenCalledOnce()
    expect(commandMock).toHaveBeenCalledWith('start', expect.any(Function))
  })

  it('replies with welcome message', async () => {
    const handler = new StartHandler()

    handler.register(bot as never)

    const startHandler = commandMock.mock.calls[0][1]
    const { context, replyMock } = createContext()

    await startHandler(context)

    expect(replyMock).toHaveBeenCalledOnce()
    expect(replyMock).toHaveBeenCalledWith(
      'به ربات جستجوی کار خوش آمدید! 👋\n\nبرای دیدن آخرین شغل‌ها از دستور /jobs استفاده کنید.',
    )
  })
})
