import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TODAY } from '../../constants'
import { convertDaysAgoToJalaliDate, isRecent, toJalali } from '.'

describe('date utilities', () => {
  describe('convertDaysAgoToJalaliDate', () => {
    const now = new Date('2026-09-27T10:00:00.000Z')

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(now)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return undefined when date is empty', () => {
      expect(convertDaysAgoToJalaliDate('')).toBeUndefined()
    })

    it('should return today when date is TODAY', () => {
      const result = convertDaysAgoToJalaliDate(TODAY)

      expect(result).toEqual(now)
    })

    it('should subtract given number of days from today', () => {
      const result = convertDaysAgoToJalaliDate('2')

      expect(result).toEqual(new Date('2026-09-25T10:00:00.000Z'))
    })
  })

  describe('toJalali', () => {
    it('should convert date to Jalali yyyy/MM/dd format', () => {
      const date = new Date('2026-09-27T10:00:00.000Z')

      expect(toJalali(date)).toBe('1405/07/05')
    })
  })

  describe('isRecent', () => {
    it('should return false when postedAt is undefined', () => {
      expect(isRecent(undefined)).toBe(false)
    })

    it('should return true when postedAt is after the boundary day', () => {
      const boundary = new Date('2026-09-26T10:00:00.000Z')
      const postedAt = new Date('2026-09-27T10:00:00.000Z')

      expect(isRecent(postedAt, boundary, 'Asia/Tehran')).toBe(true)
    })

    it('should return false when postedAt is before the boundary day', () => {
      const boundary = new Date('2026-09-26T10:00:00.000Z')
      const postedAt = new Date('2026-09-25T10:00:00.000Z')

      expect(isRecent(postedAt, boundary, 'Asia/Tehran')).toBe(false)
    })

    it('should return true when postedAt and boundary are on the same day', () => {
      const boundary = new Date('2026-09-26T18:00:00.000Z')
      const postedAt = new Date('2026-09-26T01:00:00.000Z')

      expect(isRecent(postedAt, boundary, 'Asia/Tehran')).toBe(true)
    })

    it('should compare calendar days using the provider timezone', () => {
      const boundary = new Date('2026-09-26T20:00:00.000Z')
      const postedAt = new Date('2026-09-26T21:00:00.000Z')

      expect(isRecent(postedAt, boundary, 'Asia/Tehran')).toBe(true)
    })

    it('should produce different results when timezone changes the calendar day', () => {
      const boundary = new Date('2026-09-27T00:30:00.000Z')
      const postedAt = new Date('2026-09-26T23:30:00.000Z')

      expect(isRecent(postedAt, boundary, 'UTC')).toBe(false)

      expect(isRecent(postedAt, boundary, 'Asia/Tehran')).toBe(true)
    })

    it('should use UTC as the default timezone', () => {
      const boundary = new Date('2026-09-27T00:30:00.000Z')
      const postedAt = new Date('2026-09-26T23:30:00.000Z')

      expect(isRecent(postedAt, boundary)).toBe(false)
    })

    it('should use the current date as the default boundary', () => {
      vi.useFakeTimers()

      vi.setSystemTime(new Date('2026-09-27T12:00:00.000Z'))

      const postedAt = new Date('2026-09-27T01:00:00.000Z')

      expect(isRecent(postedAt, undefined, 'UTC')).toBe(true)

      vi.useRealTimers()
    })
  })
})
