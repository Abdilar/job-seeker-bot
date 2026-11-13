import { TODAY } from '../../../constants'

export const IRAN_TALENT_ORIGIN = 'https://www.irantalent.com'
export const JOB_ID_PATTERN = /^\/job\/[^/]+\/(\d+)/

// NOTE: IranTalent prints an exact day count only for the last days; everything older is a bucket, so each label maps to a single day. The open-ended `بیش از یک ماه` keeps the newest possible day (31), so an old job stays as recent as its label allows instead of being skipped as stale.
export const PASSED_DAYS_BUCKETS: Record<string, string> = {
  امروز: TODAY,
  دیروز: '1',
  'این هفته': '7',
  'در چند هفته‌ی اخیر': '21',
  'حدود یک ماه پیش': '30',
  'بیش از یک ماه': '31',
}

export const TITLE_SELECTOR = 'p.position-title'
export const COMPANY_SELECTOR = 'p.brand-name'
export const LOCATION_SELECTOR = 'span.location'
// NOTE: The city and the age spans share `text-ellipsis`, but only the age span carries `font-weight-400`, which keeps it to one node per card.
export const PASSED_DAYS_SELECTOR = 'span.font-weight-400.text-ellipsis'
export const SALARY_SELECTOR = 'div.badges > div.salary'
