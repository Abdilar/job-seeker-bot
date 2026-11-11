import type { EProvider, ICrawledJob, ICrawledJobDetail, IJob, IJobFilter } from '../../types'
import type { IJobService, SaveJobsResultType } from './job.model'
import type { IJobRepository } from '../../repositories/job'

export class JobService implements IJobService {
  constructor(private readonly repository: IJobRepository) {}

  async save(data: ICrawledJob): Promise<IJob> {
    try {
      this.validate(data)
      return await this.repository.create(data)
    } catch {
      throw new Error('Failed saving job operation!')
    }
  }

  async saveAll(data: Array<ICrawledJob>): Promise<SaveJobsResultType> {
    const validJobs = data.filter((item) => this.isValid(item))
    // eslint-disable-next-line no-console
    console.log('Saving jobs started...', { validJobs: validJobs.length })
    await this.repository.createMany(validJobs)
    // eslint-disable-next-line no-console
    console.log('Save all verified jobs...', { validJobs: validJobs.length })
    const result: SaveJobsResultType = {
      total: data.length,
      saved: validJobs.length || 0,
      failed: data.length - validJobs.length,
    }

    return result
  }

  async saveJobDetail(id: string, data: ICrawledJobDetail): Promise<IJob> {
    try {
      // eslint-disable-next-line no-console
      console.log('Saving job detail started...', { jobId: id, data })
      const result = await this.repository.updateDetail(id, data)
      // eslint-disable-next-line no-console
      console.log('Save job detail...', { jobId: id, job: result })
      return result
    } catch {
      throw new Error('Failed updating job detail operation!')
    }
  }

  getJobs(page: number, limit: number, filter?: IJobFilter): Promise<IJob[]> {
    return this.repository.findPaginated(page, limit, filter)
  }

  getJobsWithoutDetails(): Promise<IJob[]> {
    return this.repository.findJobsWithoutDetails()
  }

  getJob(id: string): Promise<IJob | null> {
    return this.repository.findById(id)
  }

  getLatestJobByProvider(provider: EProvider): Promise<IJob | null> {
    return this.repository.findLatestByProvider(provider)
  }

  isValid(data: ICrawledJob): boolean {
    try {
      this.validate(data)
      return true
    } catch {
      return false
    }
  }

  private validate(data: ICrawledJob): void {
    if (!data.title) {
      throw new Error('The title is required!')
    }

    if (!data.contractType) {
      throw new Error('The contract type is required!')
    }

    if (!data.company.fullName) {
      throw new Error('The company is required!')
    }

    if (!data.location.country) {
      throw new Error('The location of country is required!')
    }

    if (!data.provider) {
      throw new Error('The provider is required!')
    }

    if (data === undefined) {
      throw new Error('The job detail is not undefined!')
    }

    try {
      new URL(data.url)
    } catch {
      throw new Error('The url of job is required')
    }
  }

  count(filter?: IJobFilter): Promise<number> {
    return this.repository.count(filter)
  }
}
