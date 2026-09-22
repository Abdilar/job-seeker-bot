import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { randomDelay } from '.'

describe('randomDelay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should resolve after the minimum delay', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const promise = randomDelay(1000, 3000)

    await vi.advanceTimersByTimeAsync(999)

    let resolved = false

    void promise.then(() => {
      resolved = true
    })

    await vi.advanceTimersByTimeAsync(0)

    expect(resolved).toBe(false)

    await vi.advanceTimersByTimeAsync(1)

    expect(resolved).toBe(true)
  })

  it('should resolve after the maximum delay', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)

    const promise = randomDelay(1000, 3000)

    let resolved = false

    void promise.then(() => {
      resolved = true
    })

    await vi.advanceTimersByTimeAsync(2999)

    expect(resolved).toBe(false)

    await vi.advanceTimersByTimeAsync(1)

    expect(resolved).toBe(true)
  })

  it('should generate a delay within the specified range', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    const promise = randomDelay(1000, 3000)

    const delay = setTimeoutSpy.mock.calls[0]?.[1]

    expect(delay).toBeGreaterThanOrEqual(1000)
    expect(delay).toBeLessThanOrEqual(3000)

    await vi.runAllTimersAsync()

    await promise
  })

  it('should use the exact delay when min and max are equal', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    const promise = randomDelay(1500, 1500)

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1500)

    await vi.advanceTimersByTimeAsync(1500)

    await expect(promise).resolves.toBeUndefined()
  })

  it('should resolve immediately when min and max are zero', async () => {
    const promise = randomDelay(0, 0)

    await vi.runAllTimersAsync()

    await expect(promise).resolves.toBeUndefined()
  })

  it('should return a Promise that resolves to undefined', async () => {
    const promise = randomDelay(1000, 3000)

    expect(promise).toBeInstanceOf(Promise)

    await vi.runAllTimersAsync()

    await expect(promise).resolves.toBeUndefined()
  })
})
