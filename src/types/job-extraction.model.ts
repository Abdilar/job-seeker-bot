import type { EVisaSponsorship, EWorkMode } from './job.model'

export interface IExtractedJob {
  description: string | null
  companyDescription: string | null
  skills: Array<string>
  responsibilities: Array<string>
  requirements: Array<string>
  preferredQualifications: Array<string>
  benefits: Array<string>
  workMode: EWorkMode | null
  visaSponsorship: EVisaSponsorship | null
}
