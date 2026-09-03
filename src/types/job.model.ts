import { ICompany } from "./company.model"
import { EContractType } from "./contract.model"
import { ILocation } from "./location.model"
import { EProvider } from "./provider.model"

interface IBaseJob {
  title: string
  url: string
  contractType: EContractType 
  salary?: string
  postedAt?: Date
  provider: EProvider
}

export interface ICrawledJob extends IBaseJob{
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