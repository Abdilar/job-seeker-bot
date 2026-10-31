export const LOCATION_COUNTRY = 'ایران'
export const JOB_VISION_ORIGIN = 'https://jobvision.ir'
export const JOB_ID_PATTERN = /^\/jobs\/(\d+)/
export const YESTERDAY = 'دیروز'
export const SALARY_CURRENCY = 'تومان'

export const TITLE_SELECTOR = '.job-card-title'
export const COMPANY_SELECTOR = 'a[href^="/companies"]'
// NOTE: Jobvision puts the place link under `/jobs/category/`; its text is a city (e.g. `فردیس کرج`), while Jobinja yields a province.
export const LOCATION_SELECTOR = 'a[href^="/jobs/category/"]'
export const PASSED_DAYS_SELECTOR = 'div.label-01'
export const PART_TIME_SELECTOR = 'a[href="/jobs/type/part-time"]'
// NOTE: In the card's meta row the location and ` | ` spans are classed; the salary is the only bare child span.
export const SALARY_SELECTOR = 'div.jvt-whitespace-nowrap > span:not([class])'
