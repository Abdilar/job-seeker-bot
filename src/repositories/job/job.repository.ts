import { Job, Prisma } from "@prisma/client";
import { IJobRepository } from "./job.model";
import { prisma } from "../../database/prisma";

export class JobRepository implements IJobRepository {
  async create(data: Prisma.JobCreateInput): Promise<Job> {
    return await prisma.job.upsert({
      where: { url: data.url },
      create: data,
      update: {
        title: data.title,
        contractType: data.contractType,
        salary: data.salary,
        postedAt: data.postedAt,
      },
    });
  }

  async createMany(data: Array<Prisma.JobCreateInput>): Promise<Job[]> {
    return prisma.$transaction(
      data.map((job) =>
        prisma.job.upsert({
          where: { url: job.url },
          create: job,
          update: {
            title: job.title,
            contractType: job.contractType,
            salary: job.salary,
            postedAt: job.postedAt,
          },
        }),
      ),
    );
  }

  async update(id: string, data: Prisma.JobUpdateInput): Promise<Job> {
    return prisma.job.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Job> {
    return prisma.job.delete({ where: { id } });
  }

  async findById(id: string): Promise<Job | null> {
    return prisma.job.findUnique({ where: { id } });
  }

  async findByUrl(url: string): Promise<Job | null> {
    return prisma.job.findUnique({ where: { url } });
  }

  async findAll(): Promise<Job[]> {
    return prisma.job.findMany({ orderBy: { postedAt: "desc" } });
  }

  async exists(url: string): Promise<boolean> {
    const job = await prisma.job.findUnique({
      where: { url },
      select: { id: true },
    });
    return !!job;
  }

  async count(): Promise<number> {
    return prisma.job.count();
  }
}
