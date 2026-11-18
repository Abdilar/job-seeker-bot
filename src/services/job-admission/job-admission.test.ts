import { describe, expect, it, vi } from 'vitest'
import type { IJobStatusChecker } from '../../crawlers/status'
import type { IJobRepository } from '../../repositories/job'
import { EContractType, EJobStatus, EProvider, type ICrawledJob } from '../../types'
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

const createChecker = (status: EJobStatus, supports = true): CheckerMock => {
  const checkMock = vi.fn().mockResolvedValue({
    status,
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
    const checker = createChecker(EJobStatus.EXPIRED)
    const service = new JobAdmissionService(repository, [checker], { maxChecks: 10 })

    findExistingUrlsMock.mockResolvedValue(new Set([job.url]))

    const result = await service.filterNewJobs([job])

    expect(result).toEqual({ accepted: [job], rejected: 0 })
    expect(checker.checkMock).not.toHaveBeenCalled()
  })

  it('accepts active and unknown new jobs', async () => {
    const activeJob = createJob({ url: 'https://example.com/job/active' })
    const unknownJob = createJob({
      url: 'https://example.com/job/unknown',
      provider: EProvider.JOB_VISION,
    })
    const activeChecker = {
      supports: (provider: EProvider) => provider === activeJob.provider,
      check: vi.fn().mockResolvedValue({
        status: EJobStatus.ACTIVE,
        reason: 'test',
        checkedAt: new Date(),
      }),
    }
    const unknownChecker = {
      supports: (provider: EProvider) => provider === unknownJob.provider,
      check: vi.fn().mockResolvedValue({
        status: EJobStatus.UNKNOWN,
        reason: 'test',
        checkedAt: new Date(),
      }),
    }
    const service = new JobAdmissionService(repository, [activeChecker, unknownChecker], {
      maxChecks: 10,
    })

    findExistingUrlsMock.mockResolvedValue(new Set())

    const result = await service.filterNewJobs([activeJob, unknownJob])

    expect(result.accepted[0]).toEqual(activeJob)
    expect(result.accepted[1]).toEqual({ ...unknownJob, status: EJobStatus.UNKNOWN })
    expect(result.rejected).toBe(0)
    expect(activeChecker.check).toHaveBeenCalledOnce()
    expect(unknownChecker.check).toHaveBeenCalledOnce()
  })

  it.each([EJobStatus.EXPIRED, EJobStatus.CLOSED, EJobStatus.REMOVED])(
    'rejects a new job whose status is %s',
    async (status) => {
      const job = createJob()
      const checker = createChecker(status)
      const service = new JobAdmissionService(repository, [checker], { maxChecks: 10 })
      const infoMock = vi.spyOn(console, 'info').mockImplementation(() => {})

      findExistingUrlsMock.mockResolvedValue(new Set())

      const result = await service.filterNewJobs([job])

      expect(result).toEqual({ accepted: [], rejected: 1 })
      expect(infoMock).toHaveBeenCalledOnce()
      infoMock.mockRestore()
    },
  )

  it('stops checking after maxChecks and accepts the rest', async () => {
    const first = createJob({ url: 'https://example.com/job/1' })
    const second = createJob({ url: 'https://example.com/job/2' })
    const checker = createChecker(EJobStatus.EXPIRED)
    const service = new JobAdmissionService(repository, [checker], { maxChecks: 1 })

    findExistingUrlsMock.mockResolvedValue(new Set())

    const result = await service.filterNewJobs([first, second])

    expect(result.rejected).toBe(1)
    expect(result.accepted).toEqual([second])
    expect(checker.checkMock).toHaveBeenCalledOnce()
  })

  it('accepts the job when the checker throws', async () => {
    const job = createJob()
    const checker = {
      supports: () => true,
      check: vi.fn().mockRejectedValue(new Error('network')),
    } as unknown as IJobStatusChecker
    const service = new JobAdmissionService(repository, [checker], { maxChecks: 10 })
    const errorMock = vi.spyOn(console, 'error').mockImplementation(() => {})

    findExistingUrlsMock.mockResolvedValue(new Set())

    const result = await service.filterNewJobs([job])

    expect(result.accepted).toEqual([job])
    expect(result.rejected).toBe(0)
    errorMock.mockRestore()
  })

  it('accepts jobs when no checker supports their provider', async () => {
    const job = createJob()
    const checker = createChecker(EJobStatus.EXPIRED, false)
    const service = new JobAdmissionService(repository, [checker], { maxChecks: 10 })

    findExistingUrlsMock.mockResolvedValue(new Set())

    const result = await service.filterNewJobs([job])

    expect(result.accepted).toEqual([job])
    expect(checker.checkMock).not.toHaveBeenCalled()
  })
})
