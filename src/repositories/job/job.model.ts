import { Company, Job, Location } from "@prisma/client";
import { ICrawledJob, IJob } from "../../types";

export type PrismaJobType = Job & {
  company: Company
  location: Location
}

export interface IJobRepository {
  create(data: ICrawledJob): Promise<IJob>;

  createMany(data: Array<ICrawledJob>): Promise<void>;

  delete(id: string): Promise<IJob>;

  findById(id: string): Promise<IJob | null>;

  findByUrl(url: string): Promise<IJob | null>;

  findAll(): Promise<IJob[]>;

  exists(url: string): Promise<boolean>;

  count(): Promise<number>;
}
