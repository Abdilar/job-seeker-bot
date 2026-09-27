import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  jobRepositoryInstance,
  jobServiceInstance,
  jobInJaCreatorInstance,
  executionRepositoryInstance,
  executionServiceInstance,
  crawlJobsTaskInstance,

  jobRepositoryConstructorMock,
  jobServiceConstructorMock,
  jobInJaCreatorConstructorMock,
  executionRepositoryConstructorMock,
  executionServiceConstructorMock,
  crawlJobsTaskConstructorMock,
  schedulerConstructorMock,

  recoverInterruptedExecutionsMock,
  schedulerStartMock,
  consoleLogMock,
  consoleErrorMock,
} = vi.hoisted(() => {
  const jobRepositoryMockInstance = {}
  const jobServiceMockInstance = {}
  const jobInJaCreatorMockInstance = {}
  const executionRepositoryMockInstance = {}

  const recoverMock = vi.fn<() => Promise<number>>()
  const startMock = vi.fn<() => void>()

  const executionServiceMockInstance = {
    recoverInterruptedExecutions: recoverMock,
  }

  const crawlJobsTaskMockInstance = {}

  return {
    jobRepositoryInstance: jobRepositoryMockInstance,
    jobServiceInstance: jobServiceMockInstance,
    jobInJaCreatorInstance: jobInJaCreatorMockInstance,
    executionRepositoryInstance: executionRepositoryMockInstance,
    executionServiceInstance: executionServiceMockInstance,
    crawlJobsTaskInstance: crawlJobsTaskMockInstance,

    jobRepositoryConstructorMock: vi.fn<() => void>(),

    jobServiceConstructorMock: vi.fn<(repository: unknown) => void>(),

    jobInJaCreatorConstructorMock: vi.fn<(jobService: unknown) => void>(),

    executionRepositoryConstructorMock: vi.fn<() => void>(),

    executionServiceConstructorMock: vi.fn<(repository: unknown) => void>(),

    crawlJobsTaskConstructorMock: vi.fn<(jobService: unknown, providers: unknown[]) => void>(),

    schedulerConstructorMock: vi.fn<(task: unknown, executionService: unknown) => void>(),

    recoverInterruptedExecutionsMock: recoverMock,
    schedulerStartMock: startMock,

    consoleLogMock: vi.fn<(message: string) => void>(),

    consoleErrorMock: vi.fn<(message: string, error?: unknown) => void>(),
  }
})

vi.mock('./crawlers', () => ({
  JobInJaCreator: class {
    constructor(jobService: unknown) {
      jobInJaCreatorConstructorMock(jobService)

      return jobInJaCreatorInstance
    }
  },
}))

vi.mock('./repositories', () => ({
  JobRepository: class {
    constructor() {
      jobRepositoryConstructorMock()

      return jobRepositoryInstance
    }
  },

  CrawlerExecutionRepository: class {
    constructor() {
      executionRepositoryConstructorMock()

      return executionRepositoryInstance
    }
  },
}))

vi.mock('./services', () => ({
  JobService: class {
    constructor(repository: unknown) {
      jobServiceConstructorMock(repository)

      return jobServiceInstance
    }
  },

  CrawlerExecutionService: class {
    constructor(repository: unknown) {
      executionServiceConstructorMock(repository)

      return executionServiceInstance
    }
  },
}))

vi.mock('./tasks', () => ({
  CrawlJobsTask: class {
    constructor(jobService: unknown, providers: unknown[]) {
      crawlJobsTaskConstructorMock(jobService, providers)

      return crawlJobsTaskInstance
    }
  },
}))

vi.mock('./scheduler', () => ({
  CrawlerScheduler: class {
    constructor(crawlJobsTask: unknown, executionService: unknown) {
      schedulerConstructorMock(crawlJobsTask, executionService)

      return {
        start: schedulerStartMock,
      }
    }
  },
}))

describe('crawler bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.exitCode = undefined

    recoverInterruptedExecutionsMock.mockResolvedValue(2)

    vi.spyOn(console, 'log').mockImplementation(consoleLogMock)
    vi.spyOn(console, 'error').mockImplementation(consoleErrorMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.exitCode = undefined
  })

  it('creates crawler dependencies and starts scheduler', async () => {
    await import('./crawler.bootstrap.js')

    await vi.waitFor(() => {
      expect(schedulerStartMock).toHaveBeenCalledOnce()
    })

    expect(jobRepositoryConstructorMock).toHaveBeenCalledOnce()

    expect(jobServiceConstructorMock).toHaveBeenCalledWith(jobRepositoryInstance)

    expect(jobInJaCreatorConstructorMock).toHaveBeenCalledOnce()

    expect(jobInJaCreatorConstructorMock).toHaveBeenCalledWith(jobServiceInstance)

    expect(executionRepositoryConstructorMock).toHaveBeenCalledOnce()

    expect(executionServiceConstructorMock).toHaveBeenCalledWith(executionRepositoryInstance)

    expect(crawlJobsTaskConstructorMock).toHaveBeenCalledWith(jobServiceInstance, [
      jobInJaCreatorInstance,
    ])

    expect(schedulerConstructorMock).toHaveBeenCalledWith(
      crawlJobsTaskInstance,
      executionServiceInstance,
    )

    expect(recoverInterruptedExecutionsMock).toHaveBeenCalledOnce()

    expect(schedulerStartMock).toHaveBeenCalledOnce()

    expect(consoleLogMock).toHaveBeenCalledWith('Recovered 2 interrupted crawler executions')

    expect(consoleLogMock).toHaveBeenCalledWith('Crawler scheduler started successfully!')

    expect(process.exitCode).toBeUndefined()
  })

  it('recovers interrupted executions before starting scheduler', async () => {
    const executionOrder: string[] = []

    recoverInterruptedExecutionsMock.mockImplementation(async () => {
      executionOrder.push('recover')

      return 0
    })

    schedulerStartMock.mockImplementation(() => {
      executionOrder.push('start')
    })

    await import('./crawler.bootstrap.js')

    await vi.waitFor(() => {
      expect(schedulerStartMock).toHaveBeenCalledOnce()
    })

    expect(executionOrder).toEqual(['recover', 'start'])
  })

  it('does not start scheduler when recovery fails', async () => {
    const error = new Error('Recovery failed')

    recoverInterruptedExecutionsMock.mockRejectedValue(error)

    await import('./crawler.bootstrap.js')

    await vi.waitFor(() => {
      expect(process.exitCode).toBe(1)
    })

    expect(schedulerStartMock).not.toHaveBeenCalled()

    expect(consoleErrorMock).toHaveBeenCalledWith('Crawler bootstrap failed:', error)
  })
})
