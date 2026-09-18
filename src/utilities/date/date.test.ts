import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TODAY } from '../../constants'
import { convertDaysAgoToJalaliDate, toJalali } from '.'

describe('convertDaysAgoToJalaliDate', () => {
  const today = new Date(2026, 8, 18, 12)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(today)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return undefined when date is empty', () => {
    expect(convertDaysAgoToJalaliDate('')).toBeUndefined()
  })

  it("should return today's date when date is TODAY", () => {
    expect(convertDaysAgoToJalaliDate(TODAY)).toEqual(today)
  })

  it('should subtract the given number of days from today', () => {
    expect(convertDaysAgoToJalaliDate('3')).toEqual(new Date(2026, 8, 15, 12))
  })

  it('should return today when date is zero', () => {
    expect(convertDaysAgoToJalaliDate('0')).toEqual(today)
  })
})

describe('toJalali', () => {
  it('should convert a Gregorian date to the expected Jalali date', () => {
    const date = new Date(2026, 8, 18, 12)

    expect(toJalali(date)).toBe('1405/06/27')
  })
})
