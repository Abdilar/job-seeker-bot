import { describe, expect, it, vi } from 'vitest'
import type { IJobRepository } from '../../repositories/job'
import {
  EContractType,
  EJobStatus,
  EJobStatusCheckOutcome,
  EProvider,
  type IJob,
} from '../../types'
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
    const job = createJob({ checkFailures: 2 })

    const result = await service.recordResult(job, {
      outcome: EJobStatusCheckOutcome.ACTIVE,
      reason: 'jobposting-json-ld',
      checkedAt,
    })

    expect(result).toEqual({ status: EJobStatus.ACTIVE, checkFailures: 0 })
    expect(updateStatusMock).toHaveBeenCalledWith(job.id, {
      status: EJobStatus.ACTIVE,
      reason: undefined,
      checkedAt,
      checkFailures: 0,
      expiredAt: null,
    })
  })

  it('marks a strongly expired job with a timestamp', async () => {
    const job = createJob()

    const result = await service.recordResult(job, {
      outcome: EJobStatusCheckOutcome.EXPIRED,
      reason: 'valid-through',
      checkedAt,
    })

    expect(result).toEqual({ status: EJobStatus.EXPIRED, checkFailures: 0 })
    expect(updateStatusMock).toHaveBeenCalledWith(
      job.id,
      expect.objectContaining({
        status: EJobStatus.EXPIRED,
        reason: 'valid-through',
        expiredAt: checkedAt,
      }),
    )
  })

  it('keeps the job active and increments failures when a check needs a retry', async () => {
    const job = createJob({ checkFailures: 1 })

    const result = await service.recordResult(job, {
      outcome: EJobStatusCheckOutcome.RETRY,
      reason: 'timeout',
      checkedAt,
    })

    expect(result).toEqual({ status: EJobStatus.ACTIVE, checkFailures: 2 })
    expect(updateStatusMock).toHaveBeenCalledWith(job.id, {
      status: EJobStatus.ACTIVE,
      reason: undefined,
      checkedAt,
      checkFailures: 2,
      expiredAt: null,
    })
  })

  it('keeps the previous status when a retry is needed after a non-active state', async () => {
    const job = createJob({ status: EJobStatus.ACTIVE, checkFailures: 3 })

    const result = await service.recordResult(job, {
      outcome: EJobStatusCheckOutcome.RETRY,
      reason: 'http-403',
      checkedAt,
    })

    expect(result).toEqual({ status: EJobStatus.ACTIVE, checkFailures: 4 })
  })
})
