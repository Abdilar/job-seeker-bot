import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ECrawlMode } from './constants'

const {
  jobRepositoryInstance,
  jobServiceInstance,
  jobInJaCreatorInstance,
  jobVisionCreatorInstance,
  iranTalentCreatorInstance,
  executionRepositoryInstance,
  executionServiceInstance,
  crawlJobsTaskInstance,

  jobRepositoryConstructorMock,
  jobServiceConstructorMock,
  jobInJaCreatorConstructorMock,
  jobVisionCreatorConstructorMock,
  iranTalentCreatorConstructorMock,
  executionRepositoryConstructorMock,
  executionServiceConstructorMock,
  crawlJobsTaskConstructorMock,
  schedulerConstructorMock,

  creatorModeMock,
  crawlJobsRunMock,
  recoverInterruptedExecutionsMock,
  schedulerStartMock,
  consoleLogMock,
  consoleErrorMock,
} = vi.hoisted(() => {
  const jobRepositoryMockInstance = {}
  const jobServiceMockInstance = {}
  const jobInJaCreatorMockInstance = {}
  const jobVisionCreatorMockInstance = {}
  const iranTalentCreatorMockInstance = {}
  const executionRepositoryMockInstance = {}

  const recoverMock = vi.fn<() => Promise<number>>()
  const startMock = vi.fn<() => void>()
  const runMock = vi.fn<() => Promise<void>>()
  const modeMock = vi.fn<(provider: string, mode: unknown) => void>()

  const executionServiceMockInstance = {
    recoverInterruptedExecutions: recoverMock,
  }

  const crawlJobsTaskMockInstance = {
    run: runMock,
  }

  return {
    jobRepositoryInstance: jobRepositoryMockInstance,
    jobServiceInstance: jobServiceMockInstance,
    jobInJaCreatorInstance: jobInJaCreatorMockInstance,
    jobVisionCreatorInstance: jobVisionCreatorMockInstance,
    iranTalentCreatorInstance: iranTalentCreatorMockInstance,
    executionRepositoryInstance: executionRepositoryMockInstance,
    executionServiceInstance: executionServiceMockInstance,
    crawlJobsTaskInstance: crawlJobsTaskMockInstance,

    jobRepositoryConstructorMock: vi.fn<() => void>(),

    jobServiceConstructorMock: vi.fn<(repository: unknown) => void>(),

    jobInJaCreatorConstructorMock: vi.fn<(jobService: unknown) => void>(),

    jobVisionCreatorConstructorMock: vi.fn<(jobService: unknown) => void>(),

    iranTalentCreatorConstructorMock: vi.fn<(jobService: unknown) => void>(),

    executionRepositoryConstructorMock: vi.fn<() => void>(),

    executionServiceConstructorMock: vi.fn<(repository: unknown) => void>(),

    crawlJobsTaskConstructorMock: vi.fn<(jobService: unknown, providers: unknown[]) => void>(),

    schedulerConstructorMock: vi.fn<(task: unknown, executionService: unknown) => void>(),

    creatorModeMock: modeMock,
    crawlJobsRunMock: runMock,
    recoverInterruptedExecutionsMock: recoverMock,
    schedulerStartMock: startMock,

    consoleLogMock: vi.fn<(message: string) => void>(),

    consoleErrorMock: vi.fn<(message: string, error?: unknown) => void>(),
  }
})

vi.mock('./crawlers', () => ({
  JobInJaCreator: class {
    constructor(jobService: unknown, mode?: unknown) {
      jobInJaCreatorConstructorMock(jobService)
      creatorModeMock('JOB_IN_JA', mode)

      return jobInJaCreatorInstance
    }
  },

  JobVisionCreator: class {
    constructor(jobService: unknown, mode?: unknown) {
      jobVisionCreatorConstructorMock(jobService)
      creatorModeMock('JOB_VISION', mode)

      return jobVisionCreatorInstance
    }
  },

  IranTalentCreator: class {
    constructor(jobService: unknown, mode?: unknown) {
      iranTalentCreatorConstructorMock(jobService)
      creatorModeMock('IRAN_TALENT', mode)

      return iranTalentCreatorInstance
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

    expect(iranTalentCreatorConstructorMock).toHaveBeenCalledOnce()

    expect(iranTalentCreatorConstructorMock).toHaveBeenCalledWith(jobServiceInstance)

    expect(executionRepositoryConstructorMock).toHaveBeenCalledOnce()

    expect(executionServiceConstructorMock).toHaveBeenCalledWith(executionRepositoryInstance)

    expect(crawlJobsTaskConstructorMock).toHaveBeenCalledWith(jobServiceInstance, [
      jobInJaCreatorInstance,
      jobVisionCreatorInstance,
      iranTalentCreatorInstance,
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

describe('crawler full bootstrap', () => {
  const originalArgv = [...process.argv]

  const runBootstrap = async (...args: string[]): Promise<void> => {
    process.argv = ['node', 'dist/crawler-full.bootstrap.js', ...args]

    await import('./crawler-full.bootstrap.js')

    await vi.waitFor(() => {
      expect(crawlJobsRunMock).toHaveBeenCalledOnce()
    })
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    // NOTE: The bootstrap ends the process once the run settles, so the test keeps it alive.
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    vi.spyOn(console, 'log').mockImplementation(consoleLogMock)
    vi.spyOn(console, 'error').mockImplementation(consoleErrorMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()

    process.argv = originalArgv
  })

  it('crawls only the provider named by --providers', async () => {
    await runBootstrap('--mode=full', '--providers=iran_talent')

    expect(jobRepositoryConstructorMock).toHaveBeenCalledOnce()
    expect(jobServiceConstructorMock).toHaveBeenCalledWith(jobRepositoryInstance)

    expect(iranTalentCreatorConstructorMock).toHaveBeenCalledOnce()
    expect(creatorModeMock).toHaveBeenCalledWith('IRAN_TALENT', ECrawlMode.FULL)

    expect(jobInJaCreatorConstructorMock).not.toHaveBeenCalled()
    expect(jobVisionCreatorConstructorMock).not.toHaveBeenCalled()

    expect(crawlJobsTaskConstructorMock).toHaveBeenCalledWith(jobServiceInstance, [
      iranTalentCreatorInstance,
    ])

    expect(consoleLogMock).toHaveBeenCalledWith('Crawler finished successfully')
  })

  it('keeps every provider of a comma separated list and their order', async () => {
    await runBootstrap('--mode=full', '--providers=job_vision,job_in_ja')

    expect(creatorModeMock).toHaveBeenCalledTimes(2)
    expect(creatorModeMock).toHaveBeenCalledWith('JOB_VISION', ECrawlMode.FULL)
    expect(creatorModeMock).toHaveBeenCalledWith('JOB_IN_JA', ECrawlMode.FULL)

    expect(iranTalentCreatorConstructorMock).not.toHaveBeenCalled()

    expect(crawlJobsTaskConstructorMock).toHaveBeenCalledWith(jobServiceInstance, [
      jobVisionCreatorInstance,
      jobInJaCreatorInstance,
    ])
  })

  it('treats a missing mode as incremental', async () => {
    await runBootstrap('--providers=job_in_ja')

    expect(creatorModeMock).toHaveBeenCalledWith('JOB_IN_JA', ECrawlMode.INCREMENTAL)
  })

  it('crawls nothing when --providers is absent', async () => {
    await runBootstrap('--mode=full')

    expect(creatorModeMock).not.toHaveBeenCalled()
    expect(crawlJobsTaskConstructorMock).toHaveBeenCalledWith(jobServiceInstance, [])
  })

  it('skips a provider that has no creator yet', async () => {
    await runBootstrap('--mode=full', '--providers=in_deed')

    expect(creatorModeMock).not.toHaveBeenCalled()
    expect(crawlJobsTaskConstructorMock).toHaveBeenCalledWith(jobServiceInstance, [])
  })
})
