import type { ICompany } from './company.model'
import type { EContractType } from './contract.model'
import type { ILocation } from './location.model'
import type { EProvider } from './provider.model'

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
  // locationId: string
  // companyId: string
  createdAt?: Date
  updatedAt?: Date
}

export interface IJobFilter {
  contractType?: EContractType
  provider?: EProvider
}

export interface IJobDetails {
  description?: string
  responsibilities?: string[]
  requirements?: string[]
  preferredQualifications?: string[]
  benefits?: string[]
  skills?: string[]
  experience?: IJobExperience
  education?: EEducationLevel
  workMode?: EWorkMode
  visaSponsorship?: EVisaSponsorship
  applicationUrl?: string
}

export interface IJobExperience {
  raw?: string
  minYears?: number
  maxYears?: number
}

export enum EWorkMode {
  ONSITE = 'ONSITE',
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
}

export enum EVisaSponsorship {
  AVAILABLE = 'AVAILABLE',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
}

export enum EEducationLevel {
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  ASSOCIATE = 'ASSOCIATE',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  PHD = 'PHD',
}
