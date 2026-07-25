import { Job, Prisma } from "@prisma/client";
import { IJob } from "../../types/job.model";

export interface IJobRepository {
  create(data: IJob): Promise<Job>;

  createMany(data: Array<IJob>): Promise<Job[]>;

  delete(id: string): Promise<Job>;

  findById(id: string): Promise<Job | null>;

  findByUrl(url: string): Promise<Job | null>;

  findAll(): Promise<Job[]>;

  exists(url: string): Promise<boolean>;

  count(): Promise<number>;
}
