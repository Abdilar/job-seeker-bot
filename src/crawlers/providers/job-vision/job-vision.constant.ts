export const JOB_VISION_URL = 'https://jobvision.ir/jobs?sort=0'
export const MAIN_ELEMENT_SELECTOR = 'job-card-list'
export const JOB_ELEMENT_SELECTOR = 'job-card > a'
export const JOB_VISION_PAGE_SIZE = 30
export const JOB_VISION_TIMEZONE = 'Asia/Tehran'
export const JOB_VISION_RENDER_TIMEOUT = 15_000

// NOTE: `.seo-title` renders its count with Arabic-Indic digits (٠-٩), which the shared `toEnglishDigits` does not cover.
export const NON_ENGLISH_DIGIT_MAP: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
}
