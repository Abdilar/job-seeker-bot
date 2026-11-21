import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  jobRepositoryInstance,
  jobServiceInstance,
  jobInJaCreatorInstance,
  jobVisionCreatorInstance,
  executionRepositoryInstance,
  executionServiceInstance,
  crawlJobsTaskInstance,
  jobExpirationServiceInstance,
  expireJobsTaskInstance,

  jobRepositoryConstructorMock,
  jobServiceConstructorMock,
  jobInJaCreatorConstructorMock,
  jobVisionCreatorConstructorMock,
  executionRepositoryConstructorMock,
  executionServiceConstructorMock,
  crawlJobsTaskConstructorMock,
  jobExpirationServiceConstructorMock,
  expireJobsTaskConstructorMock,
  schedulerConstructorMock,
  jobExpirationSchedulerConstructorMock,

  recoverInterruptedExecutionsMock,
  schedulerStartMock,
  jobExpirationSchedulerStartMock,
  consoleLogMock,
  consoleErrorMock,
} = vi.hoisted(() => {
  const jobRepositoryMockInstance = {}
  const jobServiceMockInstance = {}
  const jobInJaCreatorMockInstance = {}
  const jobVisionCreatorMockInstance = {}
  const executionRepositoryMockInstance = {}
  const jobExpirationServiceMockInstance = {}
  const expireJobsTaskMockInstance = {}
  const recoverMock = vi.fn<() => Promise<number>>()
  const startMock = vi.fn<() => void>()
  const jobExpirationStartMock = vi.fn<() => void>()
  const executionServiceMockInstance = {
    recoverInterruptedExecutions: recoverMock,
  }
  const crawlJobsTaskMockInstance = {}

  return {
    jobRepositoryInstance: jobRepositoryMockInstance,
    jobServiceInstance: jobServiceMockInstance,
    jobInJaCreatorInstance: jobInJaCreatorMockInstance,
    jobVisionCreatorInstance: jobVisionCreatorMockInstance,
    executionRepositoryInstance: executionRepositoryMockInstance,
    executionServiceInstance: executionServiceMockInstance,
    crawlJobsTaskInstance: crawlJobsTaskMockInstance,
    jobExpirationServiceInstance: jobExpirationServiceMockInstance,
    expireJobsTaskInstance: expireJobsTaskMockInstance,

    jobRepositoryConstructorMock: vi.fn<() => void>(),
    jobServiceConstructorMock: vi.fn<(repository: unknown) => void>(),
    jobInJaCreatorConstructorMock: vi.fn<(jobService: unknown) => void>(),
    jobVisionCreatorConstructorMock: vi.fn<(jobService: unknown) => void>(),
    executionRepositoryConstructorMock: vi.fn<() => void>(),
    executionServiceConstructorMock: vi.fn<(repository: unknown) => void>(),
    crawlJobsTaskConstructorMock: vi.fn<(jobService: unknown, providers: unknown[]) => void>(),
    jobExpirationServiceConstructorMock: vi.fn<(repository: unknown) => void>(),
    expireJobsTaskConstructorMock: vi.fn<(service: unknown, options: unknown) => void>(),
    schedulerConstructorMock: vi.fn<(task: unknown, executionService: unknown) => void>(),
    jobExpirationSchedulerConstructorMock: vi.fn<(task: unknown) => void>(),

    recoverInterruptedExecutionsMock: recoverMock,
    schedulerStartMock: startMock,
    jobExpirationSchedulerStartMock: jobExpirationStartMock,
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

  JobVisionCreator: class {
    constructor(jobService: unknown) {
      jobVisionCreatorConstructorMock(jobService)

      return jobVisionCreatorInstance
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

  JobExpirationService: class {
    constructor(repository: unknown) {
      jobExpirationServiceConstructorMock(repository)

      return jobExpirationServiceInstance
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

  ExpireJobsTask: class {
    constructor(service: unknown, options: unknown) {
      expireJobsTaskConstructorMock(service, options)

      return expireJobsTaskInstance
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

  JobExpirationScheduler: class {
    constructor(expireJobsTask: unknown) {
      jobExpirationSchedulerConstructorMock(expireJobsTask)

      return {
        start: jobExpirationSchedulerStartMock,
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

  it('creates crawler dependencies and starts both schedulers', async () => {
    await import('./crawler-incremental.bootstrap.js')

    await vi.waitFor(() => {
      expect(schedulerStartMock).toHaveBeenCalledOnce()
    })

    expect(jobRepositoryConstructorMock).toHaveBeenCalledOnce()
    expect(jobServiceConstructorMock).toHaveBeenCalledWith(jobRepositoryInstance)
    expect(jobInJaCreatorConstructorMock).toHaveBeenCalledWith(jobServiceInstance)
    expect(jobVisionCreatorConstructorMock).toHaveBeenCalledWith(jobServiceInstance)
    expect(executionRepositoryConstructorMock).toHaveBeenCalledOnce()
    expect(executionServiceConstructorMock).toHaveBeenCalledWith(executionRepositoryInstance)
    expect(crawlJobsTaskConstructorMock).toHaveBeenCalledWith(jobServiceInstance, [
      jobInJaCreatorInstance,
      jobVisionCreatorInstance,
    ])
    expect(jobExpirationServiceConstructorMock).toHaveBeenCalledWith(jobRepositoryInstance)
    expect(expireJobsTaskConstructorMock).toHaveBeenCalledWith(
      jobExpirationServiceInstance,
      expect.any(Object),
    )
    expect(schedulerConstructorMock).toHaveBeenCalledWith(
      crawlJobsTaskInstance,
      executionServiceInstance,
    )
    expect(jobExpirationSchedulerConstructorMock).toHaveBeenCalledWith(expireJobsTaskInstance)
    expect(recoverInterruptedExecutionsMock).toHaveBeenCalledOnce()
    expect(schedulerStartMock).toHaveBeenCalledOnce()
    expect(jobExpirationSchedulerStartMock).toHaveBeenCalledOnce()
    expect(consoleLogMock).toHaveBeenCalledWith('Recovered 2 interrupted crawler executions')
    expect(consoleLogMock).toHaveBeenCalledWith('Crawler scheduler started successfully!')
    expect(process.exitCode).toBeUndefined()
  })

  it('recovers interrupted executions before starting the crawler scheduler', async () => {
    const executionOrder: string[] = []

    recoverInterruptedExecutionsMock.mockImplementation(async () => {
      executionOrder.push('recover')

      return 0
    })

    schedulerStartMock.mockImplementation(() => {
      executionOrder.push('start')
    })

    await import('./crawler-incremental.bootstrap.js')

    await vi.waitFor(() => {
      expect(schedulerStartMock).toHaveBeenCalledOnce()
    })

    expect(executionOrder).toEqual(['recover', 'start'])
  })

  it('does not start schedulers when recovery fails', async () => {
    const error = new Error('Recovery failed')

    recoverInterruptedExecutionsMock.mockRejectedValue(error)

    await import('./crawler-incremental.bootstrap.js')

    await vi.waitFor(() => {
      expect(process.exitCode).toBe(1)
    })

    expect(schedulerStartMock).not.toHaveBeenCalled()
    expect(jobExpirationSchedulerStartMock).not.toHaveBeenCalled()
    expect(consoleErrorMock).toHaveBeenCalledWith('Crawler bootstrap failed:', error)
  })
})
