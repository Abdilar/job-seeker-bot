import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { queryRawMock, disconnectMock, fetchMock, consoleLogMock, consoleErrorMock } = vi.hoisted(
  () => ({
    queryRawMock: vi.fn(),
    disconnectMock: vi.fn(),
    fetchMock: vi.fn(),
    consoleLogMock: vi.fn(),
    consoleErrorMock: vi.fn(),
  }),
)

vi.mock('../../database/prisma', () => ({
  prisma: {
    $queryRaw: queryRawMock,
    $disconnect: disconnectMock,
  },
}))

describe('bot health', () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.exitCode = undefined
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'

    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'log').mockImplementation(consoleLogMock)
    vi.spyOn(console, 'error').mockImplementation(consoleErrorMock)

    queryRawMock.mockResolvedValue([{ '?column?': 1 }])
    disconnectMock.mockResolvedValue(undefined)

    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()

    process.exitCode = undefined

    if (originalToken === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalToken
    }
  })

  it('passes health check when Telegram and database are healthy', async () => {
    await import('./bot.health.js')

    await vi.waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledOnce()
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(queryRawMock).toHaveBeenCalledOnce()

    expect(consoleLogMock).toHaveBeenCalledWith('Bot health check passed')

    expect(consoleErrorMock).not.toHaveBeenCalled()
    expect(process.exitCode).toBeUndefined()
  })

  it('fails when Telegram bot token is not defined', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN

    await import('./bot.health.js')

    await vi.waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledOnce()
    })

    expect(fetchMock).not.toHaveBeenCalled()

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Bot health check failed:',
      expect.objectContaining({
        message: 'TELEGRAM_BOT_TOKEN is not defined',
      }),
    )

    expect(process.exitCode).toBe(1)
  })

  it('fails when Telegram API returns an error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        ok: false,
        description: 'Unauthorized',
      }),
    })

    await import('./bot.health.js')

    await vi.waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledOnce()
    })

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Bot health check failed:',
      expect.objectContaining({
        message: 'Unauthorized',
      }),
    )

    expect(process.exitCode).toBe(1)
  })

  it('fails when database health check fails', async () => {
    queryRawMock.mockRejectedValue(new Error('Database connection failed'))

    await import('./bot.health.js')

    await vi.waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledOnce()
    })

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Bot health check failed:',
      expect.objectContaining({
        message: 'Database connection failed',
      }),
    )

    expect(process.exitCode).toBe(1)
  })
})
