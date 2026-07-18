import { ICompany } from "./company.model"
import { ILocation } from "./location.model"
import { Provider } from "./provider.model"

export interface IJob {
  id: string
  title: string
  contractType: string
  company: ICompany
  location: ILocation
  url?: string
  salary?: string
  postedAt?: string
  provider: Provider
}