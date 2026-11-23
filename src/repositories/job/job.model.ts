import type { Company, Job, Location } from '@prisma/client'
import type { EProvider, EJobStatus, ICrawledJob, IJob, IJobFilter } from '../../types'

export type PrismaJobType = Job & {
  company: Company
  location: Location
}

export interface IJobVerificationUpdate {
  status: EJobStatus
  checkedAt: Date
  reason?: string
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
  expireOlderThan(cutoff: Date): Promise<number>
  updateVerification(id: string, update: IJobVerificationUpdate): Promise<void>
  touchVerification(id: string, checkedAt: Date): Promise<void>
  exists(url: string): Promise<boolean>
  count(filter?: IJobFilter): Promise<number>
}
