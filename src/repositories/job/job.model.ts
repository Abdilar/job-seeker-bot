import type { Company, Job, Location } from '@prisma/client'
import type { EProvider, EJobStatus, ICrawledJob, IJob, IJobFilter } from '../../types'

export type PrismaJobType = Job & {
  company: Company
  location: Location
}

export interface IRevalidationCandidateQuery {
  providers: EProvider[]
  staleBefore: Date
  limit: number
}

export interface IJobStatusUpdate {
  status: EJobStatus
  reason?: string
  checkedAt: Date
  checkFailures: number
  unknownSince?: Date | null
  expiredAt?: Date | null
}

export interface IJobRepository {
  create(data: ICrawledJob): Promise<IJob>
  createMany(data: Array<ICrawledJob>): Promise<void>
  delete(id: string): Promise<IJob>
  findById(id: string): Promise<IJob | null>
  findByUrl(url: string): Promise<IJob | null>
  findLatestByProvider(provider: EProvider): Promise<IJob | null>
  findAll(): Promise<IJob[]>
  findPaginated(page: number, limit: number, filter?: IJobFilter): Promise<IJob[]>
  findForRevalidation(query: IRevalidationCandidateQuery): Promise<IJob[]>
  findExistingUrls(urls: string[]): Promise<Set<string>>
  updateStatus(id: string, update: IJobStatusUpdate): Promise<void>
  exists(url: string): Promise<boolean>
  count(filter?: IJobFilter): Promise<number>
}
