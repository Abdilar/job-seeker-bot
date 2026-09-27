import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { queryRawMock, disconnectMock, healthCheckMock, consoleLogMock, consoleErrorMock } =
  vi.hoisted(() => ({
    queryRawMock: vi.fn(),
    disconnectMock: vi.fn(),
    healthCheckMock: vi.fn(),
    consoleLogMock: vi.fn<(message: string) => void>(),
    consoleErrorMock: vi.fn<(message: string, error?: unknown) => void>(),
  }))

vi.mock('../../database/prisma', () => ({
  prisma: {
    $queryRaw: queryRawMock,
    $disconnect: disconnectMock,
  },
}))

vi.mock('../../repositories', () => ({
  CrawlerExecutionRepository: class {},
}))

vi.mock('../../services', () => ({
  CrawlerExecutionHealthService: class {
    check = healthCheckMock
  },
}))

describe('crawler health', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.exitCode = undefined

    queryRawMock.mockResolvedValue([{ '?column?': 1 }])
    disconnectMock.mockResolvedValue(undefined)

    healthCheckMock.mockResolvedValue({
      status: 'HEALTHY',
      message: 'Crawler is healthy',
    })

    vi.spyOn(console, 'log').mockImplementation(consoleLogMock)
    vi.spyOn(console, 'error').mockImplementation(consoleErrorMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.exitCode = undefined
  })

  it('passes health check when database and crawler are healthy', async () => {
    await import('./crawler.health.js')

    await vi.waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledOnce()
    })

    expect(queryRawMock).toHaveBeenCalledOnce()
    expect(healthCheckMock).toHaveBeenCalledOnce()

    expect(consoleLogMock).toHaveBeenCalledOnce()
    expect(consoleErrorMock).not.toHaveBeenCalled()
    expect(process.exitCode).toBeUndefined()

    const logMessage = consoleLogMock.mock.calls[0][0]

    expect(logMessage).toContain('"service":"crawler"')
    expect(logMessage).toContain('"infrastructure":"HEALTHY"')
    expect(logMessage).toContain('"execution":"HEALTHY"')
    expect(logMessage).toContain('"message":"Crawler is healthy"')
    expect(logMessage).toContain('"checkedAt":')
  })

  it('fails when database health check fails', async () => {
    queryRawMock.mockRejectedValue(new Error('Database connection failed'))

    await import('./crawler.health.js')

    await vi.waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledOnce()
    })

    expect(queryRawMock).toHaveBeenCalledOnce()
    expect(healthCheckMock).not.toHaveBeenCalled()

    expect(consoleErrorMock).toHaveBeenCalledWith('Crawler health check failed:', expect.any(Error))

    expect(process.exitCode).toBe(1)
  })

  it('fails when crawler health service throws', async () => {
    healthCheckMock.mockRejectedValue(new Error('Crawler health check failed'))

    await import('./crawler.health.js')

    await vi.waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledOnce()
    })

    expect(queryRawMock).toHaveBeenCalledOnce()
    expect(healthCheckMock).toHaveBeenCalledOnce()

    expect(consoleErrorMock).toHaveBeenCalledWith('Crawler health check failed:', expect.any(Error))

    expect(process.exitCode).toBe(1)
  })

  it('fails when Prisma disconnect fails', async () => {
    disconnectMock.mockRejectedValue(new Error('Disconnect failed'))

    await import('./crawler.health.js')

    await vi.waitFor(() => {
      expect(consoleErrorMock).toHaveBeenCalledWith('Prisma disconnect failed:', expect.any(Error))
    })

    expect(queryRawMock).toHaveBeenCalledOnce()
    expect(healthCheckMock).toHaveBeenCalledOnce()
    expect(disconnectMock).toHaveBeenCalledOnce()

    expect(consoleLogMock).toHaveBeenCalledOnce()
    expect(process.exitCode).toBe(1)
  })
})
