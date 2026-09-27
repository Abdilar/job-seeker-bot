import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  repositoryInstance,
  jobServiceInstance,
  repositoryConstructorMock,
  jobServiceConstructorMock,
  telegramBotConstructorMock,
  startMock,
  dotenvConfigMock,
  consoleErrorMock,
} = vi.hoisted(() => {
  const repositoryMockInstance = {}
  const jobServiceMockInstance = {}

  return {
    repositoryInstance: repositoryMockInstance,
    jobServiceInstance: jobServiceMockInstance,

    repositoryConstructorMock: vi.fn(function () {
      return repositoryMockInstance
    }),

    jobServiceConstructorMock: vi.fn(function () {
      return jobServiceMockInstance
    }),

    telegramBotConstructorMock: vi.fn<(token: string, jobService: unknown) => void>(),

    startMock: vi.fn<() => Promise<void>>(),

    dotenvConfigMock: vi.fn(),

    consoleErrorMock: vi.fn<(message: string, error?: unknown) => void>(),
  }
})

vi.mock('dotenv', () => ({
  default: {
    config: dotenvConfigMock,
  },
}))

vi.mock('./repositories', () => ({
  JobRepository: repositoryConstructorMock,
}))

vi.mock('./services', () => ({
  JobService: jobServiceConstructorMock,
}))

vi.mock('./telegram/telegram.bootstrap', () => ({
  TelegramBot: class {
    constructor(token: string, jobService: unknown) {
      telegramBotConstructorMock(token, jobService)
    }

    start(): Promise<void> {
      return startMock()
    }
  },
}))

describe('bot bootstrap', () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.exitCode = undefined
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'

    startMock.mockResolvedValue(undefined)

    vi.spyOn(console, 'error').mockImplementation(consoleErrorMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()

    process.exitCode = undefined

    if (originalToken === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalToken
    }
  })

  it('starts Telegram bot with configured dependencies', async () => {
    await import('./bot.bootstrap.js')

    expect(dotenvConfigMock).toHaveBeenCalledOnce()

    expect(repositoryConstructorMock).toHaveBeenCalledOnce()

    expect(jobServiceConstructorMock).toHaveBeenCalledOnce()
    expect(jobServiceConstructorMock).toHaveBeenCalledWith(repositoryInstance)

    expect(telegramBotConstructorMock).toHaveBeenCalledOnce()
    expect(telegramBotConstructorMock).toHaveBeenCalledWith('test-token', jobServiceInstance)

    expect(startMock).toHaveBeenCalledOnce()
    expect(process.exitCode).toBeUndefined()
  })

  it('throws when Telegram bot token is not defined', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN

    await expect(import('./bot.bootstrap.js')).rejects.toThrow('TELEGRAM_BOT_TOKEN is not defined!')

    expect(repositoryConstructorMock).toHaveBeenCalledOnce()
    expect(jobServiceConstructorMock).toHaveBeenCalledOnce()

    expect(telegramBotConstructorMock).not.toHaveBeenCalled()
    expect(startMock).not.toHaveBeenCalled()
  })

  it('sets exit code when Telegram bot fails to start', async () => {
    const error = new Error('Telegram connection failed')

    startMock.mockRejectedValue(error)

    await import('./bot.bootstrap.js')

    await vi.waitFor(() => {
      expect(process.exitCode).toBe(1)
    })

    expect(startMock).toHaveBeenCalledOnce()

    expect(consoleErrorMock).toHaveBeenCalledWith('Telegram bot failed:', error)
  })
})
