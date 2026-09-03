import { Prisma, EProvider as EPrismaProvider } from "@prisma/client";
import { IJobRepository, PrismaJobType } from "./job.model";
import { prisma } from "../../database/prisma";
import {
  EProvider as EDomainProvider,
  IJob,
  ICrawledJob,
  EContractType,
  IJobFilter,
} from "../../types";
import { chunk } from "../../utilities";

const prismaProviderMap: Record<EDomainProvider, EPrismaProvider> = {
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

const domainProviderMap: Record<EPrismaProvider, EDomainProvider> = {
  [EPrismaProvider.JOB_IN_JA]: EDomainProvider.JOB_IN_JA,
  [EPrismaProvider.LINKED_IN]: EDomainProvider.LINKED_IN,
  [EPrismaProvider.GREENHOUSE]: EDomainProvider.GREENHOUSE,
  [EPrismaProvider.INDEED]: EDomainProvider.INDEED,
  [EPrismaProvider.IRAN_TALENT]: EDomainProvider.IRAN_TALENT,
  [EPrismaProvider.JOB_VISION]: EDomainProvider.JOB_VISION,
  [EPrismaProvider.SEEK]: EDomainProvider.SEEK,
  [EPrismaProvider.WORKDAY]: EDomainProvider.WORKDAY,
  [EPrismaProvider.LEVER]: EDomainProvider.LEVER,
};

const contractTypeMap: Record<string, EContractType> = {
  [EContractType.FULL_TIME]: EContractType.FULL_TIME,
  [EContractType.PART_TIME]: EContractType.PART_TIME,
};

export class JobRepository implements IJobRepository {
  private convertICrawledJobToJobCreateInput(
    data: ICrawledJob,
  ): Prisma.JobCreateInput {
    return {
      ...data,
      salary: data.salary ?? null,
      postedAt: data.postedAt ?? null,
      provider: prismaProviderMap[data.provider],
      company: {
        connectOrCreate: {
          where: {
            fullName: data.company.fullName,
          },
          create: {
            fullName: data.company.fullName,
            englishName: data.company.englishName ?? null,
            persianName: data.company.persianName ?? null,
          },
        },
      },
      location: {
        connectOrCreate: {
          where: {
            country_province: {
              country: data.location.country,
              province: data.location.province,
            },
          },
          create: {
            country: data.location.country,
            province: data.location.province,
          },
        },
      },
    };
  }

  private convertPrismaJobToIJob(data: PrismaJobType): IJob {
    return {
      ...data,
      contractType: contractTypeMap[data.contractType],
      postedAt: data.postedAt ? new Date(data.postedAt) : undefined,
      provider: domainProviderMap[data.provider],
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
      salary: data.salary ?? undefined,
      company: {
        ...data.company,
        englishName: data.company.englishName ?? undefined,
        persianName: data.company.persianName ?? undefined,
      },
    };
  }

  async create(data: ICrawledJob): Promise<IJob> {
    const result = await prisma.job.upsert({
      where: { url: data.url },
      create: this.convertICrawledJobToJobCreateInput(data),
      update: {
        title: data.title,
        contractType: data.contractType,
        salary: data.salary,
        postedAt: data.postedAt,
      },
      include: {
        company: true,
        location: true,
      },
    });

    return this.convertPrismaJobToIJob(result);
  }

  async createMany(data: Array<ICrawledJob>): Promise<void> {
    const chunks = chunk(data, 100);

    console.log("total jobs:", data.length);
    console.log("total chunks:", chunks.length);

    for (const [index, chunk] of chunks.entries()) {
      console.log(
        `processing chunk ${index + 1}/${chunks.length}`,
        chunk.length,
      );

      const prismaData = chunk.map((job) =>
        prisma.job.upsert({
          where: { url: job.url },
          create: this.convertICrawledJobToJobCreateInput(job),
          update: {
            title: job.title,
            contractType: job.contractType,
            salary: job.salary,
            postedAt: job.postedAt,
          },
          include: {
            company: true,
            location: true,
          },
        }),
      );

      await prisma.$transaction(prismaData);
    }
  }

  async delete(id: string): Promise<IJob> {
    const result = await prisma.job.delete({
      where: { id },
      include: { company: true, location: true },
    });
    return this.convertPrismaJobToIJob(result);
  }

  async findById(id: string): Promise<IJob | null> {
    const job = await prisma.job.findUnique({
      where: { id },
      include: { company: true, location: true },
    });

    if (!job) {
      return null
    }

    return this.convertPrismaJobToIJob(job)
  }

  async findByUrl(url: string): Promise<IJob | null> {
    const job = await prisma.job.findUnique({
      where: { url },
      include: { company: true, location: true },
    });

    if (!job) {
      return null
    }

    return this.convertPrismaJobToIJob(job)
  }

  async findAll(): Promise<IJob[]> {
    const jobs = await prisma.job.findMany({
      orderBy: { postedAt: "desc" },
      include: { company: true, location: true },
    });

    return jobs.map((job) => this.convertPrismaJobToIJob(job))
  }

  async findPaginated(page: number, limit: number, filter?: IJobFilter): Promise<IJob[]> {
    const offset = (page - 1) * limit
    const jobs = await prisma.job.findMany({
      where: {
        ...(filter?.contractType && { contractType: filter.contractType }),
        ...(filter?.provider && { provider: filter.provider })
      },
      skip: offset,
      take: limit,
      orderBy: {postedAt: "desc"},
      include: {
        company: true,
        location: true
      }
    })

    return jobs.map(job => this.convertPrismaJobToIJob(job))
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
