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

export function isRecent(
  postedAt?: Date,
  boundary = new Date(),
  timezone: string = 'UTC',
): boolean {
  if (!postedAt) return false

  const postedDate = getDateParts(postedAt, timezone)
  const boundaryDate = getDateParts(boundary, timezone)

  return postedDate >= boundaryDate
}

function getDateParts(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(date)

  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)

  return year * 10_000 + month * 100 + day
}
