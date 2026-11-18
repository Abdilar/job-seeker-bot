import { describe, expect, it, vi } from 'vitest'
import type { IJobStatusChecker } from '../../crawlers/status'
import type { IJobRepository } from '../../repositories/job'
import { EContractType, EJobStatusCheckOutcome, EProvider, type ICrawledJob } from '../../types'
import { JobAdmissionService } from './job-admission.service'

const createJob = (overrides: Partial<ICrawledJob> = {}): ICrawledJob => ({
  title: 'Example',
  url: 'https://example.com/job/1',
  contractType: EContractType.FULL_TIME,
  provider: EProvider.JOB_IN_JA,
  company: { fullName: 'Example' },
  location: { country: 'Iran', province: 'Tehran' },
  ...overrides,
})

type CheckerMock = IJobStatusChecker & { checkMock: ReturnType<typeof vi.fn> }

const createChecker = (outcome: EJobStatusCheckOutcome, supports = true): CheckerMock => {
  const checkMock = vi.fn().mockResolvedValue({
    outcome,
    reason: 'test',
    checkedAt: new Date('2026-11-18T10:00:00.000Z'),
  })

  return {
    supports: () => supports,
    check: checkMock as IJobStatusChecker['check'],
    checkMock,
  }
}

describe('JobAdmissionService', () => {
  const findExistingUrlsMock = vi.fn<IJobRepository['findExistingUrls']>()

  const repository = {
    findExistingUrls: findExistingUrlsMock,
  } as unknown as IJobRepository

  it('does not check jobs that already exist', async () => {
    const job = createJob()
    const checker = createChecker(EJobStatusCheckOutcome.EXPIRED)
    const service = new JobAdmissionService(repository, [checker], { maxChecks: 10 })

    findExistingUrlsMock.mockResolvedValue(new Set([job.url]))

    const result = await service.filterNewJobs([job])

    expect(result).toEqual({ accepted: [job], rejected: 0, retry: 0 })
    expect(checker.checkMock).not.toHaveBeenCalled()
  })

  it('accepts active jobs and postpones unverified ones', async () => {
    const activeJob = createJob({ url: 'https://example.com/job/active' })
    const retryJob = createJob({
      url: 'https://example.com/job/retry',
      provider: EProvider.JOB_VISION,
    })
    const activeChecker = {
      supports: (provider: EProvider) => provider === activeJob.provider,
      check: vi.fn().mockResolvedValue({
        outcome: EJobStatusCheckOutcome.ACTIVE,
        reason: 'test',
        checkedAt: new Date(),
      }),
    }
    const retryChecker = {
      supports: (provider: EProvider) => provider === retryJob.provider,
      check: vi.fn().mockResolvedValue({
        outcome: EJobStatusCheckOutcome.RETRY,
        reason: 'test',
        checkedAt: new Date(),
      }),
    }
    const service = new JobAdmissionService(repository, [activeChecker, retryChecker], {
      maxChecks: 10,
    })

    findExistingUrlsMock.mockResolvedValue(new Set())

    const result = await service.filterNewJobs([activeJob, retryJob])

    expect(result.accepted).toEqual([activeJob])
    expect(result.rejected).toBe(0)
    expect(result.retry).toBe(1)
    expect(activeChecker.check).toHaveBeenCalledOnce()
    expect(retryChecker.check).toHaveBeenCalledOnce()
  })

  it.each([
    EJobStatusCheckOutcome.EXPIRED,
    EJobStatusCheckOutcome.CLOSED,
    EJobStatusCheckOutcome.REMOVED,
  ])('rejects a new job whose outcome is %s', async (outcome) => {
    const job = createJob()
    const checker = createChecker(outcome)
    const service = new JobAdmissionService(repository, [checker], { maxChecks: 10 })
    const infoMock = vi.spyOn(console, 'info').mockImplementation(() => {})

    findExistingUrlsMock.mockResolvedValue(new Set())

    const result = await service.filterNewJobs([job])

    expect(result).toEqual({ accepted: [], rejected: 1, retry: 0 })
    expect(infoMock).toHaveBeenCalledOnce()
    infoMock.mockRestore()
  })

  it('stops checking after maxChecks and accepts the rest', async () => {
    const first = createJob({ url: 'https://example.com/job/1' })
    const second = createJob({ url: 'https://example.com/job/2' })
    const checker = createChecker(EJobStatusCheckOutcome.EXPIRED)
    const service = new JobAdmissionService(repository, [checker], { maxChecks: 1 })

    findExistingUrlsMock.mockResolvedValue(new Set())

    const result = await service.filterNewJobs([first, second])

    expect(result.rejected).toBe(1)
    expect(result.accepted).toEqual([second])
    expect(checker.checkMock).toHaveBeenCalledOnce()
  })

  it('postpones the job when the checker throws', async () => {
    const job = createJob()
    const checker = {
      supports: () => true,
      check: vi.fn().mockRejectedValue(new Error('network')),
    } as unknown as IJobStatusChecker
    const service = new JobAdmissionService(repository, [checker], { maxChecks: 10 })
    const errorMock = vi.spyOn(console, 'error').mockImplementation(() => {})

    findExistingUrlsMock.mockResolvedValue(new Set())

    const result = await service.filterNewJobs([job])

    expect(result.accepted).toEqual([])
    expect(result.rejected).toBe(0)
    expect(result.retry).toBe(1)
    errorMock.mockRestore()
  })

  it('accepts jobs when no checker supports their provider', async () => {
    const job = createJob()
    const checker = createChecker(EJobStatusCheckOutcome.EXPIRED, false)
    const service = new JobAdmissionService(repository, [checker], { maxChecks: 10 })

    findExistingUrlsMock.mockResolvedValue(new Set())

    const result = await service.filterNewJobs([job])

    expect(result.accepted).toEqual([job])
    expect(checker.checkMock).not.toHaveBeenCalled()
  })
})
