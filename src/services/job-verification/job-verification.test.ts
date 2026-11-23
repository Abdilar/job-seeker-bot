import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IJobLinkChecker } from '../../crawlers/verification'
import type { IJobRepository } from '../../repositories/job'
import { EContractType, EJobStatus, EProvider, type IJob } from '../../types'
import { JobVerificationService } from './job-verification.service'

const createJob = (overrides: Partial<IJob> = {}): IJob => ({
  id: 'job-1',
  title: 'Example',
  url: 'https://example.com/job/1',
  contractType: EContractType.FULL_TIME,
  provider: EProvider.JOB_IN_JA,
  status: EJobStatus.ACTIVE,
  company: { fullName: 'Example' },
  location: { country: 'Iran', province: 'Tehran' },
  ...overrides,
})

describe('JobVerificationService', () => {
  const updateVerificationMock = vi.fn<IJobRepository['updateVerification']>()
  const touchVerificationMock = vi.fn<IJobRepository['touchVerification']>()
  const repository = {
    updateVerification: updateVerificationMock,
    touchVerification: touchVerificationMock,
  } as unknown as IJobRepository
  const checkMock = vi.fn<IJobLinkChecker['check']>()
  const checker = {
    supports: () => true,
    check: checkMock,
  } as unknown as IJobLinkChecker
  const service = new JobVerificationService(repository, checker, 60)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-23T10:00:00.000Z'))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('skips a recently verified job', async () => {
    const job = createJob({ lastVerifiedAt: new Date('2026-11-23T09:30:00.000Z') })

    const result = await service.verify(job)

    expect(result).toBe(job)
    expect(checkMock).not.toHaveBeenCalled()
  })

  it('updates the status after a definitive check', async () => {
    const job = createJob()
    checkMock.mockResolvedValue({
      status: EJobStatus.EXPIRED,
      reason: 'source-expired',
      checkedAt: new Date('2026-11-23T10:00:00.000Z'),
    })

    const result = await service.verify(job)

    expect(updateVerificationMock).toHaveBeenCalledWith(job.id, {
      status: EJobStatus.EXPIRED,
      checkedAt: new Date('2026-11-23T10:00:00.000Z'),
      reason: 'source-expired',
    })
    expect(result).toMatchObject({
      status: EJobStatus.EXPIRED,
      expiryReason: 'source-expired',
      lastVerifiedAt: new Date('2026-11-23T10:00:00.000Z'),
    })
  })

  it('only touches the verification time when the check is inconclusive', async () => {
    const job = createJob()
    checkMock.mockResolvedValue({
      reason: 'timeout',
      checkedAt: new Date('2026-11-23T10:00:00.000Z'),
    })

    const result = await service.verify(job)

    expect(touchVerificationMock).toHaveBeenCalledWith(job.id, new Date('2026-11-23T10:00:00.000Z'))
    expect(result).toMatchObject({
      status: EJobStatus.ACTIVE,
      lastVerifiedAt: new Date('2026-11-23T10:00:00.000Z'),
    })
  })

  it('does not check inactive jobs', async () => {
    const job = createJob({ status: EJobStatus.EXPIRED })

    const result = await service.verify(job)

    expect(result).toBe(job)
    expect(checkMock).not.toHaveBeenCalled()
  })
})
