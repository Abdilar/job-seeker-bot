import { ICompany } from './company.model'
import { EContractType } from './contract.model'
import { ILocation } from './location.model'
import { EJobStatus } from './job-status.model'
import { EProvider } from './provider.model'

interface IBaseJob {
  title: string
  url: string
  contractType: EContractType
  salary?: string
  postedAt?: Date
  provider: EProvider
}

export interface ICrawledJob extends IBaseJob {
  company: ICompany
  location: ILocation
}

export interface IJob extends ICrawledJob {
  id: string
  status: EJobStatus
  lastSeenAt?: Date
  expiredAt?: Date
  expiryReason?: string
  archivedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface IJobFilter {
  contractType?: EContractType
  provider?: EProvider
  status?: EJobStatus
  includeArchived?: boolean
}
