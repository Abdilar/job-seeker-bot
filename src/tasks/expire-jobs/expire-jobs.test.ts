import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IJobExpirationService } from '../../services'
import { ExpireJobsTask } from './expire-jobs.task'

describe('ExpireJobsTask', () => {
  const expireOlderThanMock = vi.fn<IJobExpirationService['expireOlderThan']>()
  const service = {
    expireOlderThan: expireOlderThanMock,
  } as unknown as IJobExpirationService

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-21T10:00:00.000Z'))
    expireOlderThanMock.mockResolvedValue(0)
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('expires jobs older than the configured TTL', async () => {
    expireOlderThanMock.mockResolvedValue(12)
    const task = new ExpireJobsTask(service, { ttlDays: 30 })

    const result = await task.run()

    expect(expireOlderThanMock).toHaveBeenCalledWith(new Date('2026-10-22T10:00:00.000Z'))
    expect(result).toEqual({
      cutoff: new Date('2026-10-22T10:00:00.000Z'),
      expired: 12,
    })
  })

  it('supports a different TTL', async () => {
    const task = new ExpireJobsTask(service, { ttlDays: 7 })

    await task.run()

    expect(expireOlderThanMock).toHaveBeenCalledWith(new Date('2026-11-14T10:00:00.000Z'))
  })
})
