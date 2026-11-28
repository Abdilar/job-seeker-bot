import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EJobStatus as PrismaJobStatus,
  EProvider as PrismaProvider,
  type Company,
  type Job,
  type Location,
} from '@prisma/client'
import { EContractType, EJobStatus, EProvider } from '../../types'
import { JobRepository } from './job.repository'

const { jobMock } = vi.hoisted(() => ({
  jobMock: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
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
  lastVerifiedAt: null,
  expiredAt: null,
  expiryReason: null,
  removalReason: null,
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

  it('expires active jobs older than the cutoff in one batch', async () => {
    const cutoff = new Date('2026-10-23T10:00:00.000Z')
    jobMock.updateMany.mockResolvedValue({ count: 4 })

    const expired = await repository.expireOlderThan(cutoff)

    expect(expired).toBe(4)
    const updateArgs = jobMock.updateMany.mock.calls[0]?.[0] as {
      where: {
        status: PrismaJobStatus
        archivedAt: null
        postedAt: { lt: Date }
      }
      data: {
        status: PrismaJobStatus
        expiredAt: Date
        expiryReason: string
      }
    }

    expect(updateArgs.where).toEqual({
      status: PrismaJobStatus.ACTIVE,
      archivedAt: null,
      postedAt: { lt: cutoff },
    })
    expect(updateArgs.data.status).toBe(PrismaJobStatus.EXPIRED)
    expect(updateArgs.data.expiredAt).toBeInstanceOf(Date)
    expect(updateArgs.data.expiryReason).toBe('ttl')
  })

  it('updates the verification fields of an inactive job', async () => {
    const checkedAt = new Date('2026-11-23T10:00:00.000Z')

    await repository.updateVerification('job-1', {
      status: EJobStatus.EXPIRED,
      checkedAt,
      reason: 'source-expired',
    })

    expect(jobMock.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: {
        status: PrismaJobStatus.EXPIRED,
        lastVerifiedAt: checkedAt,
        expiredAt: checkedAt,
        expiryReason: 'source-expired',
        removalReason: null,
      },
    })
  })

  it('touches the verification time without changing the status', async () => {
    const checkedAt = new Date('2026-11-23T10:00:00.000Z')

    await repository.touchVerification('job-1', checkedAt)

    expect(jobMock.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { lastVerifiedAt: checkedAt },
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
      lastSeenAt: prismaJob.lastSeenAt,
    })
  })
})
