import { EContractType, EProvider } from "../types"

export const PAGINATION_LIMIT = 15

export const CONTRACT_TYPE_MAP = {
  [EContractType.FULL_TIME]: 'تمام وقت',
  [EContractType.PART_TIME]: 'پاره وقت'
}

export const PROVIDER_MAP = {
  [EProvider.JOB_IN_JA]: 'جابینجا',
  [EProvider.IRAN_TALENT]: 'ایران تلنت',
  [EProvider.JOB_VISION]: 'جاب ویژن',
  [EProvider.GREENHOUSE]: 'Greenhouse',
  [EProvider.INDEED]: 'Indeed',
  [EProvider.LEVER]: 'Lever',
  [EProvider.LINKED_IN]: 'Linkedin',
  [EProvider.SEEK]: 'Seek',
  [EProvider.WORKDAY]: 'Workday',
}