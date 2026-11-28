import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JOB_POSTING_TIMEZONE } from '../../crawlers/constants'
import type { IExpireJobsTask } from '../../tasks'
import { JobExpirationScheduler } from './job-expiration.scheduler'

const { scheduleMock } = vi.hoisted(() => ({ scheduleMock: vi.fn() }))

vi.mock('node-cron', () => ({
  default: { schedule: scheduleMock },
}))

describe('JobExpirationScheduler', () => {
  const runMock = vi.fn<() => Promise<void>>()
  const task = { run: runMock } as unknown as IExpireJobsTask

  beforeEach(() => {
    vi.clearAllMocks()
    runMock.mockResolvedValue(undefined)
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('schedules expiration with the configured time and timezone', () => {
    const scheduler = new JobExpirationScheduler(task, '0 4 * * *')

    scheduler.start()

    expect(scheduleMock).toHaveBeenCalledWith('0 4 * * *', expect.any(Function), {
      timezone: JOB_POSTING_TIMEZONE,
    })
  })

  it('runs the task when the cron callback fires', async () => {
    const scheduler = new JobExpirationScheduler(task, '0 4 * * *')

    scheduler.start()
    const callback = scheduleMock.mock.calls[0][1] as () => Promise<void>
    await callback()

    expect(runMock).toHaveBeenCalledOnce()
  })

  it('does not run two expirations at the same time', async () => {
    let release: () => void = () => {}
    runMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    const scheduler = new JobExpirationScheduler(task, '0 4 * * *')

    scheduler.start()
    const callback = scheduleMock.mock.calls[0][1] as () => Promise<void>
    const first = callback()
    const second = callback()

    await vi.waitFor(() => {
      expect(runMock).toHaveBeenCalledOnce()
    })

    release()
    await Promise.all([first, second])
  })
})
