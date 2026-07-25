import { Job } from "@prisma/client";
import { IJob } from "../../types/job.model";
import { IJobService, SaveJobsResultType } from "./job.model";
import { IJobRepository } from "../../repositories/job";

export class JobService implements IJobService {
  constructor(private readonly repository: IJobRepository) {}

  async save(data: IJob): Promise<Job> {
    try {
      this.validate(data);
      return this.repository.create(data);
    } catch (error) {
      throw new Error("Failed saving job operation!");
    }
  }

  async saveAll(data: Array<IJob>): Promise<SaveJobsResultType> {
    const result: SaveJobsResultType = {
      total: data.length,
      saved: 0,
      failed: 0
    }

    for(const job of data) {
      try {
        await this.save(job);
        result.saved += 1;
      } catch (error) {
        result.failed += 1
        console.error(`Failed to save job: ${job.url}`, error)
      }
    }

    return result
  }

  isValid(data: IJob): boolean {
    try {
      this.validate(data);
      return true;
    } catch (_) {
      return false;
    }
  }

  private validate(data: IJob): void {
    if (!data.title) {
      throw new Error("The title is required!");
    }

    if (!data.contractType) {
      throw new Error("The contract type is required!");
    }

    if (!data.company.full_name) {
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
}
