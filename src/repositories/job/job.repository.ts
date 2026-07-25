import { Job, Prisma, EProvider as EPrismaProvider } from "@prisma/client";
import { IJobRepository } from "./job.model";
import { prisma } from "../../database/prisma";
import { IJob } from "../../types/job.model";
import { EProvider as EDomainProvider } from "../../types/provider.model";

const providerMap: Record<EDomainProvider, EPrismaProvider> = {
  [EDomainProvider.JOB_IN_JA]: EPrismaProvider.JOB_IN_JA,
  [EDomainProvider.LINKED_IN]: EPrismaProvider.LINKED_IN,
  [EDomainProvider.GREENHOUSE]: EPrismaProvider.GREENHOUSE,
  [EDomainProvider.INDEED]: EPrismaProvider.INDEED,
  [EDomainProvider.IRAN_TALENT]: EPrismaProvider.IRAN_TALENT,
  [EDomainProvider.JOB_VISION]: EPrismaProvider.JOB_VISION,
  [EDomainProvider.SEEK]: EPrismaProvider.SEEK,
  [EDomainProvider.WORKDAY]: EPrismaProvider.WORKDAY,
  [EDomainProvider.LEVER]: EPrismaProvider.LEVER,
};

export class JobRepository implements IJobRepository {
  private toCreateInput(data: IJob): Prisma.JobCreateInput {
    return {
      title: data.title,
      url: data.url,
      contractType: data.contractType,
      salary: data.salary ?? null,
      postedAt: data.postedAt ?? null,
      provider: providerMap[data.provider],
      company: {
        connectOrCreate: {
          where: {
            fullName: data.company.full_name,
          },
          create: {
            fullName: data.company.full_name,
            englishName: data.company.english_name ?? null,
            persianName: data.company.persian_name ?? null,
          },
        },
      },
      location: {
        connectOrCreate: {
          where: {
            country_province: {
              country: data.location.country,
              province: data.location.province,
            }
          },
          create: {
            country: data.location.country,
            province: data.location.province,
          },
        },
      },
    };
  }
  async create(data: IJob): Promise<Job> {
    return await prisma.job.upsert({
      where: { url: data.url },
      create: this.toCreateInput(data),
      update: {
        title: data.title,
        contractType: data.contractType,
        salary: data.salary,
        postedAt: data.postedAt,
      },
      include: {
        company: true,
        location: true
      }
    });
  }

  async createMany(data: Array<IJob>): Promise<Job[]> {
    return prisma.$transaction(
      data.map((job) =>
        prisma.job.upsert({
          where: { url: job.url },
          create: this.toCreateInput(job),
          update: {
            title: job.title,
            contractType: job.contractType,
            salary: job.salary,
            postedAt: job.postedAt,
          },
          include: {
            company: true,
            location: true
          }
        }),
      ),
    );
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
