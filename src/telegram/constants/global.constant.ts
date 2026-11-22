import {
  EContractType,
  EEducationLevel,
  EGender,
  EProvider,
  EVisaSponsorship,
  EWorkMode,
} from '../../types'

export const PAGINATION_LIMIT = 15

export const CONTRACT_TYPE_MAP = {
  [EContractType.FULL_TIME]: 'تمام وقت',
  [EContractType.PART_TIME]: 'پاره وقت',
}

export const VISA_SPONSORSHIP_MAP = {
  [EVisaSponsorship.AVAILABLE]: 'حمایت از ویزای کاری',
  [EVisaSponsorship.NOT_AVAILABLE]: 'عدم حمایت از ویزای کاری',
}

export const WORK_MODE_MAP = {
  [EWorkMode.HYBRID]: 'ترکیبی',
  [EWorkMode.ONSITE]: 'حضوری',
  [EWorkMode.REMOTE]: 'دورکاری',
}

export const GENDER_MAP = {
  [EGender.MAN]: 'مرد',
  [EGender.WOMAN]: 'زن',
}

export const EDUCATION_MAP = {
  [EEducationLevel.HIGH_SCHOOL]: 'دیپلم',
  [EEducationLevel.ASSOCIATE]: 'فوق‌دیپلم',
  [EEducationLevel.BACHELOR]: 'لیسانس',
  [EEducationLevel.MASTER]: 'فوق‌لیسانس',
  [EEducationLevel.PHD]: 'دکترا',
}

export const PROVIDER_MAP = {
  [EProvider.JOB_IN_JA]: 'جابینجا',
  [EProvider.IRAN_TALENT]: 'ایران تلنت',
  [EProvider.JOB_VISION]: 'جاب ویژن',
  [EProvider.E_ESTEKHDAM]: 'ای استخدام',
  [EProvider.GREENHOUSE]: 'Greenhouse',
  [EProvider.INDEED]: 'Indeed',
  [EProvider.LEVER]: 'Lever',
  [EProvider.LINKED_IN]: 'Linkedin',
  [EProvider.SEEK]: 'Seek',
  [EProvider.WORKDAY]: 'Workday',
}
