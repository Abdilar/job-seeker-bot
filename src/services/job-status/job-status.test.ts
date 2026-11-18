import { describe, expect, it, vi } from 'vitest'
import type { IJobRepository } from '../../repositories/job'
import { EContractType, EJobStatus, EProvider, type IJob } from '../../types'
import { JobStatusService } from './job-status.service'

const createJob = (overrides: Partial<IJob> = {}): IJob => ({
  id: 'job-1',
  title: 'Example',
  url: 'https://example.com/job/1',
  contractType: EContractType.FULL_TIME,
  provider: EProvider.JOB_IN_JA,
  status: EJobStatus.ACTIVE,
  checkFailures: 0,
  company: { fullName: 'Example' },
  location: { country: 'Iran', province: 'Tehran' },
  ...overrides,
})

const checkedAt = new Date('2026-11-18T10:00:00.000Z')

describe('JobStatusService', () => {
  const findForRevalidationMock = vi.fn<IJobRepository['findForRevalidation']>()
  const updateStatusMock = vi.fn<IJobRepository['updateStatus']>()
  const repository = {
    findForRevalidation: findForRevalidationMock,
    updateStatus: updateStatusMock,
  } as unknown as IJobRepository

  const service = new JobStatusService(repository)

  it('forwards candidate filters to the repository', async () => {
    findForRevalidationMock.mockResolvedValue([])
    const staleBefore = new Date('2026-11-11T10:00:00.000Z')

    await service.findCandidates([EProvider.JOB_IN_JA], staleBefore, 25)

    expect(findForRevalidationMock).toHaveBeenCalledWith({
      providers: [EProvider.JOB_IN_JA],
      staleBefore,
      limit: 25,
    })
  })

  it('resets the failure state after a successful check', async () => {
    const job = createJob({ checkFailures: 2, unknownSince: checkedAt })

    const result = await service.recordResult(
      job,
      { status: EJobStatus.ACTIVE, reason: 'jobposting-json-ld', checkedAt },
      3,
    )

    expect(result).toEqual({ status: EJobStatus.ACTIVE, checkFailures: 0 })
    expect(updateStatusMock).toHaveBeenCalledWith(job.id, {
      status: EJobStatus.ACTIVE,
      reason: undefined,
      checkedAt,
      checkFailures: 0,
      unknownSince: null,
      expiredAt: null,
    })
  })

  it('marks a strongly expired job with a timestamp', async () => {
    const job = createJob()

    const result = await service.recordResult(
      job,
      { status: EJobStatus.EXPIRED, reason: 'valid-through', checkedAt },
      3,
    )

    expect(result).toEqual({ status: EJobStatus.EXPIRED, checkFailures: 0 })
    expect(updateStatusMock).toHaveBeenCalledWith(
      job.id,
      expect.objectContaining({
        status: EJobStatus.EXPIRED,
        reason: 'valid-through',
        expiredAt: checkedAt,
        unknownSince: null,
      }),
    )
  })

  it('keeps a job active until the failure threshold is reached', async () => {
    const job = createJob({ checkFailures: 1 })

    const result = await service.recordResult(
      job,
      { status: EJobStatus.UNKNOWN, reason: 'timeout', checkedAt },
      3,
    )

    expect(result).toEqual({ status: EJobStatus.ACTIVE, checkFailures: 2 })
    expect(updateStatusMock).toHaveBeenCalledWith(
      job.id,
      expect.objectContaining({ status: EJobStatus.ACTIVE, checkFailures: 2 }),
    )
  })

  it('marks a job unknown at the failure threshold and preserves the first unknown time', async () => {
    const firstUnknown = new Date('2026-11-17T10:00:00.000Z')
    const job = createJob({ checkFailures: 2, unknownSince: firstUnknown })

    const result = await service.recordResult(
      job,
      { status: EJobStatus.UNKNOWN, reason: 'timeout', checkedAt },
      3,
    )

    expect(result).toEqual({ status: EJobStatus.UNKNOWN, checkFailures: 3 })
    expect(updateStatusMock).toHaveBeenCalledWith(
      job.id,
      expect.objectContaining({
        status: EJobStatus.UNKNOWN,
        reason: 'timeout',
        checkFailures: 3,
        unknownSince: firstUnknown,
      }),
    )
  })

  it('sets unknownSince when the job first becomes unknown', async () => {
    const job = createJob({ checkFailures: 2 })

    await service.recordResult(
      job,
      { status: EJobStatus.UNKNOWN, reason: 'http-403', checkedAt },
      3,
    )

    expect(updateStatusMock).toHaveBeenCalledWith(
      job.id,
      expect.objectContaining({ unknownSince: checkedAt }),
    )
  })
})
