import { describe, expect, it, vi } from 'vitest'
import type { IJobStatusChecker } from '../../crawlers/status'
import type { IJobStatusService } from '../../services'
import {
  EContractType,
  EJobStatus,
  EJobStatusCheckOutcome,
  EProvider,
  type IJob,
} from '../../types'
import { RevalidateJobsTask } from './revalidate-jobs.task'

const { randomDelayMock } = vi.hoisted(() => ({ randomDelayMock: vi.fn() }))

vi.mock('../../utilities', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utilities')>()

  return { ...actual, randomDelay: randomDelayMock }
})

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

const createChecker = (
  provider: EProvider,
  outcomes: EJobStatusCheckOutcome[],
): IJobStatusChecker & { check: ReturnType<typeof vi.fn> } => {
  let index = 0

  return {
    supports: (candidate: EProvider) => candidate === provider,
    check: vi.fn().mockImplementation(async () => ({
      outcome: outcomes[index++] ?? EJobStatusCheckOutcome.ACTIVE,
      reason: 'test',
      checkedAt: new Date('2026-11-18T10:00:00.000Z'),
    })),
  }
}

describe('RevalidateJobsTask', () => {
  const findCandidatesMock = vi.fn<IJobStatusService['findCandidates']>()
  const recordResultMock = vi.fn<IJobStatusService['recordResult']>()
  const service = {
    findCandidates: findCandidatesMock,
    recordResult: recordResultMock,
  } as unknown as IJobStatusService

  const options = {
    providers: [EProvider.JOB_IN_JA, EProvider.JOB_VISION],
    batchSize: 10,
    staleAfterDays: 7,
  }

  const createTask = (checkers: IJobStatusChecker[]) =>
    new RevalidateJobsTask(service, checkers, options)

  it('does nothing when no provider has a checker', async () => {
    const task = createTask([])

    const result = await task.run()

    expect(result).toMatchObject({ checked: 0, errors: 0 })
    expect(findCandidatesMock).not.toHaveBeenCalled()
  })

  it('checks candidates and counts every resulting outcome', async () => {
    const jobs = [
      createJob({ id: 'active', url: 'https://example.com/job/active' }),
      createJob({ id: 'expired', url: 'https://example.com/job/expired' }),
      createJob({ id: 'closed', url: 'https://example.com/job/closed' }),
      createJob({ id: 'removed', url: 'https://example.com/job/removed' }),
      createJob({ id: 'retry', url: 'https://example.com/job/retry' }),
    ]
    const checker = createChecker(EProvider.JOB_IN_JA, [
      EJobStatusCheckOutcome.ACTIVE,
      EJobStatusCheckOutcome.EXPIRED,
      EJobStatusCheckOutcome.CLOSED,
      EJobStatusCheckOutcome.REMOVED,
      EJobStatusCheckOutcome.RETRY,
    ])
    const task = createTask([checker])

    findCandidatesMock.mockResolvedValue(jobs)
    recordResultMock
      .mockResolvedValueOnce({ status: EJobStatus.ACTIVE, checkFailures: 0 })
      .mockResolvedValueOnce({ status: EJobStatus.EXPIRED, checkFailures: 0 })
      .mockResolvedValueOnce({ status: EJobStatus.CLOSED, checkFailures: 0 })
      .mockResolvedValueOnce({ status: EJobStatus.REMOVED, checkFailures: 0 })
      .mockResolvedValueOnce({ status: EJobStatus.ACTIVE, checkFailures: 1 })
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await task.run()

    expect(result).toEqual({
      checked: 5,
      active: 1,
      expired: 1,
      closed: 1,
      removed: 1,
      retry: 1,
      errors: 0,
    })
    expect(findCandidatesMock).toHaveBeenCalledWith(
      [EProvider.JOB_IN_JA],
      expect.any(Date),
      options.batchSize,
    )
    expect(recordResultMock).toHaveBeenCalledTimes(5)
  })

  it('continues after a checker error', async () => {
    const first = createJob({ id: 'first', url: 'https://example.com/job/first' })
    const second = createJob({ id: 'second', url: 'https://example.com/job/second' })
    const checker = createChecker(EProvider.JOB_IN_JA, [EJobStatusCheckOutcome.ACTIVE])
    checker.check.mockRejectedValueOnce(new Error('network'))
    const task = createTask([checker])

    findCandidatesMock.mockResolvedValue([first, second])
    recordResultMock.mockResolvedValue({ status: EJobStatus.ACTIVE, checkFailures: 0 })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await task.run()

    expect(result.checked).toBe(1)
    expect(result.errors).toBe(1)
  })
})
