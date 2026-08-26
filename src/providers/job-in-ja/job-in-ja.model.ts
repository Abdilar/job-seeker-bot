import { Browser, Page } from "playwright"
import { EContractType, EProvider, ICompany, ILocation } from "../../types"

export interface ICreateJobInJaProvider {
  browser: Browser
  page: Page
  lastPage: number
}

export interface IJobInJaJob {
  title: string
  url: string
  provider: EProvider
  postedAt?: string
  contractType: EContractType
  salary?: string
  location: ILocation
  company: ICompany
}
