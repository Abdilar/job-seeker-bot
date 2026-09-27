import { format, subDays } from 'date-fns-jalali'
import { TODAY } from '../../constants'

export function convertDaysAgoToJalaliDate(date: string): Date | undefined {
  if (!date) return
  const today = new Date()
  if (date === TODAY) {
    return today
  }

  const subDaysDate = subDays(today, Number(date))
  return subDaysDate
}

export function toJalali(date: Date): string {
  return format(date, 'yyyy/MM/dd')
}

export function isRecent(postedAt?: Date, now = new Date()): boolean {
  if (!postedAt) return false

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const date = new Date(postedAt)
  date.setHours(0, 0, 0, 0)

  return date >= today
}
