import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  jobRepositoryInstance,
  jobServiceInstance,
  jobInJaCreatorInstance,
  jobVisionCreatorInstance,
  executionRepositoryInstance,
  executionServiceInstance,
  crawlJobsTaskInstance,
  jobAdmissionServiceInstance,
  jobStatusServiceInstance,
  revalidateJobsTaskInstance,

  jobRepositoryConstructorMock,
  jobServiceConstructorMock,
  jobInJaCreatorConstructorMock,
  jobVisionCreatorConstructorMock,
  executionRepositoryConstructorMock,
  executionServiceConstructorMock,
  crawlJobsTaskConstructorMock,
  jobAdmissionServiceConstructorMock,
  jobStatusServiceConstructorMock,
  revalidateJobsTaskConstructorMock,
  schedulerConstructorMock,
  jobStatusSchedulerConstructorMock,

  recoverInterruptedExecutionsMock,
  schedulerStartMock,
  jobStatusSchedulerStartMock,
  consoleLogMock,
  consoleErrorMock,
} = vi.hoisted(() => {
  const jobRepositoryMockInstance = {}
  const jobServiceMockInstance = {}
  const jobInJaCreatorMockInstance = {}
  const jobVisionCreatorMockInstance = {}
  const executionRepositoryMockInstance = {}
  const jobAdmissionServiceMockInstance = {}
  const jobStatusServiceMockInstance = {}
  const revalidateJobsTaskMockInstance = {}

  const recoverMock = vi.fn<() => Promise<number>>()
  const startMock = vi.fn<() => void>()
  const jobStatusStartMock = vi.fn<() => void>()

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
    jobAdmissionServiceInstance: jobAdmissionServiceMockInstance,
    jobStatusServiceInstance: jobStatusServiceMockInstance,
    revalidateJobsTaskInstance: revalidateJobsTaskMockInstance,

    jobRepositoryConstructorMock: vi.fn<() => void>(),

    jobServiceConstructorMock: vi.fn<(repository: unknown) => void>(),

    jobInJaCreatorConstructorMock: vi.fn<(jobService: unknown) => void>(),

    jobVisionCreatorConstructorMock: vi.fn<(jobService: unknown) => void>(),

    executionRepositoryConstructorMock: vi.fn<() => void>(),

    executionServiceConstructorMock: vi.fn<(repository: unknown) => void>(),

    crawlJobsTaskConstructorMock:
      vi.fn<(jobService: unknown, providers: unknown[], admissionService: unknown) => void>(),

    jobAdmissionServiceConstructorMock:
      vi.fn<(repository: unknown, checkers: unknown[], options: unknown) => void>(),

    jobStatusServiceConstructorMock: vi.fn<(repository: unknown) => void>(),

    revalidateJobsTaskConstructorMock:
      vi.fn<(service: unknown, checkers: unknown[], options: unknown) => void>(),

    schedulerConstructorMock: vi.fn<(task: unknown, executionService: unknown) => void>(),

    jobStatusSchedulerConstructorMock: vi.fn<(task: unknown) => void>(),

    recoverInterruptedExecutionsMock: recoverMock,
    schedulerStartMock: startMock,
    jobStatusSchedulerStartMock: jobStatusStartMock,

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

vi.mock('./crawlers/status', () => ({
  JobInJaStatusChecker: class {
    supports() {
      return true
    }
  },

  JobVisionStatusChecker: class {
    supports() {
      return true
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

  JobAdmissionService: class {
    constructor(repository: unknown, checkers: unknown[], options: unknown) {
      jobAdmissionServiceConstructorMock(repository, checkers, options)

      return jobAdmissionServiceInstance
    }
  },

  JobStatusService: class {
    constructor(repository: unknown) {
      jobStatusServiceConstructorMock(repository)

      return jobStatusServiceInstance
    }
  },
}))

vi.mock('./tasks', () => ({
  CrawlJobsTask: class {
    constructor(jobService: unknown, providers: unknown[], admissionService: unknown) {
      crawlJobsTaskConstructorMock(jobService, providers, admissionService)

      return crawlJobsTaskInstance
    }
  },

  RevalidateJobsTask: class {
    constructor(service: unknown, checkers: unknown[], options: unknown) {
      revalidateJobsTaskConstructorMock(service, checkers, options)

      return revalidateJobsTaskInstance
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

  JobStatusScheduler: class {
    constructor(revalidateJobsTask: unknown) {
      jobStatusSchedulerConstructorMock(revalidateJobsTask)

      return {
        start: jobStatusSchedulerStartMock,
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
    await import('./crawler-incremental.bootstrap.js')

    await vi.waitFor(() => {
      expect(schedulerStartMock).toHaveBeenCalledOnce()
    })

    expect(jobRepositoryConstructorMock).toHaveBeenCalledOnce()

    expect(jobServiceConstructorMock).toHaveBeenCalledWith(jobRepositoryInstance)

    expect(jobInJaCreatorConstructorMock).toHaveBeenCalledOnce()

    expect(jobInJaCreatorConstructorMock).toHaveBeenCalledWith(jobServiceInstance)

    expect(jobVisionCreatorConstructorMock).toHaveBeenCalledOnce()

    expect(jobVisionCreatorConstructorMock).toHaveBeenCalledWith(jobServiceInstance)

    expect(executionRepositoryConstructorMock).toHaveBeenCalledOnce()

    expect(executionServiceConstructorMock).toHaveBeenCalledWith(executionRepositoryInstance)

    expect(crawlJobsTaskConstructorMock).toHaveBeenCalledWith(
      jobServiceInstance,
      [jobInJaCreatorInstance, jobVisionCreatorInstance],
      jobAdmissionServiceInstance,
    )

    expect(jobStatusServiceConstructorMock).toHaveBeenCalledWith(jobRepositoryInstance)

    expect(revalidateJobsTaskConstructorMock).toHaveBeenCalledWith(
      jobStatusServiceInstance,
      expect.any(Array),
      expect.any(Object),
    )

    expect(schedulerConstructorMock).toHaveBeenCalledWith(
      crawlJobsTaskInstance,
      executionServiceInstance,
    )

    expect(jobStatusSchedulerConstructorMock).toHaveBeenCalledWith(revalidateJobsTaskInstance)

    expect(recoverInterruptedExecutionsMock).toHaveBeenCalledOnce()

    expect(schedulerStartMock).toHaveBeenCalledOnce()

    expect(jobStatusSchedulerStartMock).toHaveBeenCalledOnce()

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

    await import('./crawler-incremental.bootstrap.js')

    await vi.waitFor(() => {
      expect(schedulerStartMock).toHaveBeenCalledOnce()
    })

    expect(executionOrder).toEqual(['recover', 'start'])
  })

  it('does not start scheduler when recovery fails', async () => {
    const error = new Error('Recovery failed')

    recoverInterruptedExecutionsMock.mockRejectedValue(error)

    await import('./crawler-incremental.bootstrap.js')

    await vi.waitFor(() => {
      expect(process.exitCode).toBe(1)
    })

    expect(schedulerStartMock).not.toHaveBeenCalled()

    expect(consoleErrorMock).toHaveBeenCalledWith('Crawler bootstrap failed:', error)
  })
})
