import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { IJobService } from '../services'

import { TelegramBot } from './telegram.bootstrap'

const {
  botInstance,
  botConstructorMock,
  botUseMock,
  botStartMock,
  sessionMock,
  jobRendererConstructorMock,
  startHandlerRegisterMock,
  jobHandlerConstructorMock,
  jobHandlerRegisterMock,
  jobFilterHandlerConstructorMock,
  jobFilterHandlerRegisterMock,
  consoleLogMock,
} = vi.hoisted(() => {
  const useMock = vi.fn<(middleware: unknown) => void>()
  const startMock =
    vi.fn<(options: { onStart: (botInfo: { username: string }) => void }) => Promise<void>>()

  const mockedBotInstance = {
    use: useMock,
    start: startMock,
  }

  return {
    botInstance: mockedBotInstance,

    botConstructorMock: vi.fn<(token: string) => void>(),
    botUseMock: useMock,
    botStartMock: startMock,

    sessionMock: vi.fn<
      (options: {
        initial: () => {
          jobFilter: Record<string, never>
        }
      }) => unknown
    >(),

    jobRendererConstructorMock: vi.fn<(jobService: unknown) => void>(),

    startHandlerRegisterMock: vi.fn<(bot: unknown) => void>(),

    jobHandlerConstructorMock: vi.fn<(jobService: unknown, jobRenderer: unknown) => void>(),

    jobHandlerRegisterMock: vi.fn<(bot: unknown) => void>(),

    jobFilterHandlerConstructorMock: vi.fn<(jobRenderer: unknown) => void>(),

    jobFilterHandlerRegisterMock: vi.fn<(bot: unknown) => void>(),

    consoleLogMock: vi.fn<(message: string) => void>(),
  }
})

vi.mock('grammy', () => ({
  Bot: class {
    constructor(token: string) {
      botConstructorMock(token)

      return botInstance
    }
  },

  session: sessionMock,
}))

vi.mock('./renders', () => ({
  JobRenderer: class {
    constructor(jobService: unknown) {
      jobRendererConstructorMock(jobService)
    }
  },
}))

vi.mock('./handlers', () => ({
  StartHandler: class {
    register(bot: unknown): void {
      startHandlerRegisterMock(bot)
    }
  },

  JobHandler: class {
    constructor(jobService: unknown, jobRenderer: unknown) {
      jobHandlerConstructorMock(jobService, jobRenderer)
    }

    register(bot: unknown): void {
      jobHandlerRegisterMock(bot)
    }
  },

  JobFilterHandler: class {
    constructor(jobRenderer: unknown) {
      jobFilterHandlerConstructorMock(jobRenderer)
    }

    register(bot: unknown): void {
      jobFilterHandlerRegisterMock(bot)
    }
  },
}))

describe('TelegramBot', () => {
  const jobServiceMock = {} as IJobService

  beforeEach(() => {
    vi.clearAllMocks()

    sessionMock.mockReturnValue({})

    botStartMock.mockResolvedValue(undefined)

    vi.spyOn(console, 'log').mockImplementation(consoleLogMock)
  })

  it('creates bot with provided token', () => {
    new TelegramBot('test-token', jobServiceMock)

    expect(botConstructorMock).toHaveBeenCalledOnce()
    expect(botConstructorMock).toHaveBeenCalledWith('test-token')
  })

  it('registers session middleware with empty job filter', () => {
    new TelegramBot('test-token', jobServiceMock)

    expect(sessionMock).toHaveBeenCalledOnce()
    expect(botUseMock).toHaveBeenCalledOnce()

    const sessionOptions = sessionMock.mock.calls[0][0]

    expect(sessionOptions.initial()).toEqual({
      jobFilter: {},
    })
  })

  it('registers all Telegram handlers', () => {
    new TelegramBot('test-token', jobServiceMock)

    expect(startHandlerRegisterMock).toHaveBeenCalledWith(botInstance)

    expect(jobHandlerRegisterMock).toHaveBeenCalledWith(botInstance)

    expect(jobFilterHandlerRegisterMock).toHaveBeenCalledWith(botInstance)
  })

  it('injects dependencies into renderer and handlers', () => {
    new TelegramBot('test-token', jobServiceMock)

    expect(jobRendererConstructorMock).toHaveBeenCalledWith(jobServiceMock)

    expect(jobHandlerConstructorMock).toHaveBeenCalledOnce()

    expect(jobFilterHandlerConstructorMock).toHaveBeenCalledOnce()
  })

  it('starts bot and logs username when started', async () => {
    botStartMock.mockImplementation(async (options) => {
      options.onStart({
        username: 'job_seeker_bot',
      })
    })

    const telegramBot = new TelegramBot('test-token', jobServiceMock)

    await telegramBot.start()

    expect(botStartMock).toHaveBeenCalledOnce()

    expect(consoleLogMock).toHaveBeenCalledWith(
      'Telegram bot @job_seeker_bot started successfully!',
    )
  })
})
