import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EJobStatus as PrismaJobStatus,
  EProvider as PrismaProvider,
  type Company,
  type Job,
  type Location,
} from '@prisma/client'
import { EContractType, EJobStatus, EProvider, type ICrawledJob } from '../../types'
import { JobRepository } from './job.repository'

const { jobMock } = vi.hoisted(() => ({
  jobMock: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../database/prisma', () => ({
  prisma: {
    job: jobMock,
    $transaction: vi.fn(),
  },
}))

const company: Company = {
  id: 'company-1',
  fullName: 'Example',
  persianName: null,
  englishName: null,
}

const location: Location = {
  id: 'location-1',
  country: 'Iran',
  province: 'Tehran',
}

const prismaJob: Job & { company: Company; location: Location } = {
  id: 'job-1',
  title: 'Example',
  url: 'https://example.com/job/1',
  contractType: EContractType.FULL_TIME,
  salary: null,
  postedAt: new Date('2026-11-01T10:00:00.000Z'),
  provider: PrismaProvider.JOB_IN_JA,
  status: PrismaJobStatus.ACTIVE,
  lastSeenAt: new Date('2026-11-18T10:00:00.000Z'),
  lastCheckedAt: null,
  expiredAt: null,
  expiryReason: null,
  checkFailures: 0,
  unknownSince: null,
  archivedAt: null,
  companyId: company.id,
  company,
  locationId: location.id,
  location,
  createdAt: new Date('2026-11-01T10:00:00.000Z'),
  updatedAt: new Date('2026-11-01T10:00:00.000Z'),
}

describe('JobRepository status support', () => {
  const repository = new JobRepository()

  beforeEach(() => {
    vi.clearAllMocks()
    jobMock.findMany.mockResolvedValue([])
  })

  it('finds revalidation candidates with the expected filters', async () => {
    const staleBefore = new Date('2026-11-11T10:00:00.000Z')

    await repository.findForRevalidation({
      providers: [EProvider.JOB_IN_JA],
      staleBefore,
      limit: 50,
    })

    expect(jobMock.findMany).toHaveBeenCalledWith({
      where: {
        provider: { in: [PrismaProvider.JOB_IN_JA] },
        status: { in: [PrismaJobStatus.ACTIVE, PrismaJobStatus.UNKNOWN] },
        archivedAt: null,
        OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: staleBefore } }],
      },
      orderBy: [{ lastCheckedAt: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
      take: 50,
      include: { company: true, location: true },
    })
  })

  it('returns the set of existing URLs', async () => {
    jobMock.findMany.mockResolvedValue([{ url: 'https://example.com/job/1' }])

    const result = await repository.findExistingUrls([
      'https://example.com/job/1',
      'https://example.com/job/2',
    ])

    expect(result).toEqual(new Set(['https://example.com/job/1']))
    expect(jobMock.findMany).toHaveBeenCalledWith({
      where: { url: { in: ['https://example.com/job/1', 'https://example.com/job/2'] } },
      select: { url: true },
    })
  })

  it('does not query the database for an empty URL list', async () => {
    const result = await repository.findExistingUrls([])

    expect(result).toEqual(new Set())
    expect(jobMock.findMany).not.toHaveBeenCalled()
  })

  it('updates the lifecycle fields of a job', async () => {
    const checkedAt = new Date('2026-11-18T10:00:00.000Z')

    await repository.updateStatus('job-1', {
      status: EJobStatus.EXPIRED,
      reason: 'valid-through',
      checkedAt,
      checkFailures: 0,
      unknownSince: null,
      expiredAt: checkedAt,
    })

    expect(jobMock.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: {
        status: PrismaJobStatus.EXPIRED,
        lastCheckedAt: checkedAt,
        checkFailures: 0,
        expiryReason: 'valid-through',
        unknownSince: null,
        expiredAt: checkedAt,
      },
    })
  })

  it('filters the public list to active, non-archived jobs by default', async () => {
    jobMock.findMany.mockResolvedValue([prismaJob])

    const jobs = await repository.findPaginated(1, 15)

    expect(jobMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: PrismaJobStatus.ACTIVE, archivedAt: null },
      }),
    )
    expect(jobs[0].status).toBe(EJobStatus.ACTIVE)
  })

  it('honors an explicit status and archive filter', async () => {
    await repository.findPaginated(1, 15, {
      status: EJobStatus.EXPIRED,
      includeArchived: true,
      provider: EProvider.JOB_IN_JA,
      contractType: EContractType.FULL_TIME,
    })

    expect(jobMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          contractType: EContractType.FULL_TIME,
          provider: PrismaProvider.JOB_IN_JA,
          status: PrismaJobStatus.EXPIRED,
        },
      }),
    )
  })

  it('maps the lifecycle fields back to the domain model', async () => {
    jobMock.findUnique.mockResolvedValue(prismaJob)

    const job = await repository.findById('job-1')

    expect(job).toMatchObject({
      status: EJobStatus.ACTIVE,
      checkFailures: 0,
      lastSeenAt: prismaJob.lastSeenAt,
    })
  })

  it('persists an explicit UNKNOWN status for a newly discovered job', async () => {
    const crawledJob: ICrawledJob = {
      title: 'Example',
      url: 'https://example.com/job/unknown',
      contractType: EContractType.FULL_TIME,
      provider: EProvider.JOB_IN_JA,
      status: EJobStatus.UNKNOWN,
      company: { fullName: 'Example' },
      location: { country: 'Iran', province: 'Tehran' },
    }
    jobMock.upsert.mockResolvedValue(prismaJob)

    await repository.createMany([crawledJob])

    const upsertArgs = jobMock.upsert.mock.calls[0]?.[0] as {
      create: { status: PrismaJobStatus }
      update: Record<string, unknown>
    }

    expect(upsertArgs.create.status).toBe(PrismaJobStatus.UNKNOWN)
    expect(upsertArgs.update).not.toHaveProperty('status')
  })
})
