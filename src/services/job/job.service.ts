import { ICrawledJob, IJob, IJobFilter } from "../../types";
import { IJobService, SaveJobsResultType } from "./job.model";
import { IJobRepository } from "../../repositories/job";

export class JobService implements IJobService {
  constructor(private readonly repository: IJobRepository) {}

  async save(data: ICrawledJob): Promise<IJob> {
    try {
      this.validate(data);
      return this.repository.create(data);
    } catch (error) {
      throw new Error("Failed saving job operation!");
    }
  }

  async saveAll(data: Array<ICrawledJob>): Promise<SaveJobsResultType> {
    const validJobs = data.filter(item => this.isValid(item))
    await this.repository.createMany(validJobs)

    const result: SaveJobsResultType = {
      total: data.length,
      saved: validJobs.length,
      failed: data.length -  validJobs.length
    }

    return result
  }

  getJobs(page: number, limit: number, filter?: IJobFilter): Promise<IJob[]> {
    return this.repository.findPaginated(page, limit, filter)
  }

  getJob(id: string): Promise<IJob | null> {
    return this.repository.findById(id)
  }

  isValid(data: ICrawledJob): boolean {
    try {
      this.validate(data);
      return true;
    } catch (_) {
      return false;
    }
  }

  private validate(data: ICrawledJob): void {
    if (!data.title) {
      throw new Error("The title is required!");
    }

    if (!data.contractType) {
      throw new Error("The contract type is required!");
    }

    if (!data.company.fullName) {
      throw new Error("The company is required!");
    }

    if (!data.location.country) {
      throw new Error("The location of country is required!");
    }

    if (!data.provider) {
      throw new Error("The provider is required!");
    }

    try {
      new URL(data.url);
    } catch (error) {
      throw new Error(`The url of job is required: ${error}`);
    }
  }

  count(filter?: IJobFilter): Promise<number> {
    return this.repository.count()
  }
}
