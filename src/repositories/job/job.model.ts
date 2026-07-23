import { Job, Prisma } from "@prisma/client";

export interface IJobRepository {
  create(data: Prisma.JobCreateInput): Promise<Job>;

  createMany(data: Array<Prisma.JobCreateInput>): Promise<Job[]>;

  update(id: string, data: Prisma.JobUpdateInput): Promise<Job>;

  delete(id: string): Promise<Job>;

  findById(id: string): Promise<Job | null>;

  findByUrl(url: string): Promise<Job | null>;

  findAll(): Promise<Job[]>;

  exists(url: string): Promise<boolean>;

  count(): Promise<number>;
}
