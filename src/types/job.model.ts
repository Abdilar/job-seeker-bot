import { ICompany } from "./company.model"
import { EContractType } from "./contract.model"
import { ILocation } from "./location.model"
import { EProvider } from "./provider.model"

export interface IJob {
  id: string
  title: string
  url: string
  contractType: EContractType 
  company: ICompany
  location: ILocation
  salary?: string
  postedAt?: string
  provider: EProvider
}