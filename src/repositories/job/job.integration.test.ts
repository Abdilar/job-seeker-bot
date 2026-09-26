import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../database/prisma'
import { EContractType, EProvider, type ICrawledJob } from '../../types'
import { JobRepository } from './job.repository'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined')
}

if (!new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error('Integration tests must run against a test database')
}

const createCrawledJob = (overrides: Partial<ICrawledJob> = {}): ICrawledJob => ({
  title: 'Senior Frontend Engineer',
  url: 'https://example.com/jobs/frontend-engineer',
  contractType: EContractType.FULL_TIME,
  provider: EProvider.JOB_IN_JA,
  salary: '1000 USD',
  postedAt: new Date('2026-09-25T10:00:00.000Z'),

  company: {
    fullName: 'Example Company',
  },

  location: {
    country: 'Iran',
    province: 'Tehran',
  },

  ...overrides,
})

describe('JobRepository integration', () => {
  const repository = new JobRepository()

  beforeEach(async () => {
    await prisma.job.deleteMany()
    await prisma.company.deleteMany()
    await prisma.location.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('create', () => {
    it('creates a job with its company and location', async () => {
      const input = createCrawledJob()

      const result = await repository.create(input)

      expect(result.id).toBeDefined()
      expect(result.title).toBe(input.title)
      expect(result.url).toBe(input.url)
      expect(result.contractType).toBe(input.contractType)
      expect(result.provider).toBe(input.provider)
      expect(result.salary).toBe(input.salary)
      expect(result.postedAt).toEqual(input.postedAt)

      expect(result.company.fullName).toBe(input.company.fullName)
      expect(result.location.country).toBe(input.location.country)
      expect(result.location.province).toBe(input.location.province)

      expect(await prisma.job.count()).toBe(1)
      expect(await prisma.company.count()).toBe(1)
      expect(await prisma.location.count()).toBe(1)
    })

    it('updates an existing job when the URL already exists', async () => {
      const input = createCrawledJob()

      const firstJob = await repository.create(input)

      const secondJob = await repository.create({
        ...input,
        title: 'Updated Frontend Engineer',
        salary: '2000 USD',
      })

      expect(secondJob.id).toBe(firstJob.id)
      expect(secondJob.title).toBe('Updated Frontend Engineer')
      expect(secondJob.salary).toBe('2000 USD')

      expect(await prisma.job.count()).toBe(1)
    })
  })

  describe('findById', () => {
    it('returns the stored job', async () => {
      const createdJob = await repository.create(createCrawledJob())

      const result = await repository.findById(createdJob.id)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(createdJob.id)
      expect(result?.title).toBe(createdJob.title)
      expect(result?.company.fullName).toBe('Example Company')
      expect(result?.location.country).toBe('Iran')
      expect(result?.provider).toBe(EProvider.JOB_IN_JA)
    })

    it('returns null when the job does not exist', async () => {
      const result = await repository.findById('non-existing-job-id')

      expect(result).toBeNull()
    })
  })

  describe('findByUrl', () => {
    it('returns the stored job', async () => {
      const input = createCrawledJob()

      await repository.create(input)

      const result = await repository.findByUrl(input.url)

      expect(result).not.toBeNull()
      expect(result?.url).toBe(input.url)
      expect(result?.title).toBe(input.title)
      expect(result?.company.fullName).toBe(input.company.fullName)
    })

    it('returns null when the URL does not exist', async () => {
      const result = await repository.findByUrl('https://example.com/jobs/not-found')

      expect(result).toBeNull()
    })
  })

  describe('createMany', () => {
    it('creates multiple jobs', async () => {
      const jobs = [
        createCrawledJob({
          title: 'Frontend Engineer',
          url: 'https://example.com/jobs/1',
        }),
        createCrawledJob({
          title: 'Backend Engineer',
          url: 'https://example.com/jobs/2',
        }),
        createCrawledJob({
          title: 'DevOps Engineer',
          url: 'https://example.com/jobs/3',
        }),
      ]

      await repository.createMany(jobs)

      const storedJobs = await prisma.job.findMany()

      expect(storedJobs).toHaveLength(3)
    })

    it('reuses the same company and location for multiple jobs', async () => {
      const jobs = [
        createCrawledJob({
          title: 'Frontend Engineer',
          url: 'https://example.com/jobs/1',
        }),
        createCrawledJob({
          title: 'Backend Engineer',
          url: 'https://example.com/jobs/2',
        }),
      ]

      await repository.createMany(jobs)

      expect(await prisma.job.count()).toBe(2)
      expect(await prisma.company.count()).toBe(1)
      expect(await prisma.location.count()).toBe(1)
    })

    it('updates an existing job instead of creating a duplicate', async () => {
      const originalJob = createCrawledJob({
        title: 'Frontend Engineer',
        url: 'https://example.com/jobs/1',
        salary: '1000 USD',
      })

      await repository.createMany([originalJob])

      await repository.createMany([
        {
          ...originalJob,
          title: 'Senior Frontend Engineer',
          salary: '2000 USD',
        },
      ])

      const jobs = await prisma.job.findMany()

      expect(jobs).toHaveLength(1)
      expect(jobs[0]?.title).toBe('Senior Frontend Engineer')
      expect(jobs[0]?.salary).toBe('2000 USD')
    })

    it('does nothing when the input is empty', async () => {
      await repository.createMany([])

      expect(await prisma.job.count()).toBe(0)
    })

    it('rolls back the chunk when one job fails', async () => {
      const validJob = createCrawledJob({
        url: 'https://example.com/jobs/valid',
      })

      const invalidJob = createCrawledJob({
        url: 'https://example.com/jobs/invalid',
      })

      invalidJob.location.province = null as unknown as string

      await expect(repository.createMany([validJob, invalidJob])).rejects.toThrow()

      expect(await prisma.job.count()).toBe(0)
    })

    it('processes jobs in multiple chunks', async () => {
      const jobs = Array.from({ length: 101 }, (_, index) =>
        createCrawledJob({
          title: `Job ${index}`,
          url: `https://example.com/jobs/${index}`,
        }),
      )

      await repository.createMany(jobs)

      expect(await prisma.job.count()).toBe(101)
    })
  })

  describe('findPaginated', () => {
    it('returns the requested page with the correct limit', async () => {
      const jobs = Array.from({ length: 5 }, (_, index) =>
        createCrawledJob({
          title: `Job ${index + 1}`,
          url: `https://example.com/jobs/${index + 1}`,
          postedAt: new Date(`2026-09-${25 - index}T10:00:00.000Z`),
        }),
      )

      await repository.createMany(jobs)

      const firstPage = await repository.findPaginated(1, 2)
      const secondPage = await repository.findPaginated(2, 2)
      const thirdPage = await repository.findPaginated(3, 2)

      expect(firstPage).toHaveLength(2)
      expect(secondPage).toHaveLength(2)
      expect(thirdPage).toHaveLength(1)

      expect(firstPage.map((job) => job.title)).toEqual(['Job 1', 'Job 2'])

      expect(secondPage.map((job) => job.title)).toEqual(['Job 3', 'Job 4'])

      expect(thirdPage[0]?.title).toBe('Job 5')
    })

    it('filters jobs by contract type', async () => {
      await repository.createMany([
        createCrawledJob({
          url: 'https://example.com/jobs/full-time',
          contractType: EContractType.FULL_TIME,
        }),
        createCrawledJob({
          url: 'https://example.com/jobs/part-time',
          contractType: EContractType.PART_TIME,
        }),
      ])

      const result = await repository.findPaginated(1, 10, {
        contractType: EContractType.PART_TIME,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.contractType).toBe(EContractType.PART_TIME)
    })

    it('filters jobs by provider', async () => {
      await repository.createMany([
        createCrawledJob({
          url: 'https://example.com/jobs/jobinja',
          provider: EProvider.JOB_IN_JA,
        }),
        createCrawledJob({
          url: 'https://example.com/jobs/linkedin',
          provider: EProvider.LINKED_IN,
        }),
      ])

      const result = await repository.findPaginated(1, 10, {
        provider: EProvider.LINKED_IN,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.provider).toBe(EProvider.LINKED_IN)
    })

    it('applies multiple filters together', async () => {
      await repository.createMany([
        createCrawledJob({
          url: 'https://example.com/jobs/1',
          provider: EProvider.JOB_IN_JA,
          contractType: EContractType.FULL_TIME,
        }),
        createCrawledJob({
          url: 'https://example.com/jobs/2',
          provider: EProvider.JOB_IN_JA,
          contractType: EContractType.PART_TIME,
        }),
        createCrawledJob({
          url: 'https://example.com/jobs/3',
          provider: EProvider.LINKED_IN,
          contractType: EContractType.PART_TIME,
        }),
      ])

      const result = await repository.findPaginated(1, 10, {
        provider: EProvider.JOB_IN_JA,
        contractType: EContractType.PART_TIME,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.url).toBe('https://example.com/jobs/2')
    })
  })

  describe('findAll', () => {
    it('returns all jobs ordered by postedAt descending', async () => {
      await repository.createMany([
        createCrawledJob({
          title: 'Old Job',
          url: 'https://example.com/jobs/old',
          postedAt: new Date('2026-09-20T10:00:00.000Z'),
        }),
        createCrawledJob({
          title: 'Newest Job',
          url: 'https://example.com/jobs/newest',
          postedAt: new Date('2026-09-25T10:00:00.000Z'),
        }),
        createCrawledJob({
          title: 'Middle Job',
          url: 'https://example.com/jobs/middle',
          postedAt: new Date('2026-09-23T10:00:00.000Z'),
        }),
      ])

      const result = await repository.findAll()

      expect(result).toHaveLength(3)

      expect(result.map((job) => job.title)).toEqual(['Newest Job', 'Middle Job', 'Old Job'])
    })

    it('returns an empty array when there are no jobs', async () => {
      const result = await repository.findAll()

      expect(result).toEqual([])
    })
  })

  describe('exists', () => {
    it('returns true when the job exists', async () => {
      const job = createCrawledJob()

      await repository.create(job)

      const result = await repository.exists(job.url)

      expect(result).toBe(true)
    })

    it('returns false when the job does not exist', async () => {
      const result = await repository.exists('https://example.com/jobs/not-found')

      expect(result).toBe(false)
    })
  })

  describe('count', () => {
    it('returns the total number of jobs', async () => {
      await repository.createMany([
        createCrawledJob({
          url: 'https://example.com/jobs/1',
        }),
        createCrawledJob({
          url: 'https://example.com/jobs/2',
        }),
        createCrawledJob({
          url: 'https://example.com/jobs/3',
        }),
      ])

      const result = await repository.count()

      expect(result).toBe(3)
    })

    it('counts jobs by contract type', async () => {
      await repository.createMany([
        createCrawledJob({
          url: 'https://example.com/jobs/1',
          contractType: EContractType.FULL_TIME,
        }),
        createCrawledJob({
          url: 'https://example.com/jobs/2',
          contractType: EContractType.PART_TIME,
        }),
        createCrawledJob({
          url: 'https://example.com/jobs/3',
          contractType: EContractType.PART_TIME,
        }),
      ])

      const result = await repository.count({
        contractType: EContractType.PART_TIME,
      })

      expect(result).toBe(2)
    })

    it('counts jobs by provider', async () => {
      await repository.createMany([
        createCrawledJob({
          url: 'https://example.com/jobs/1',
          provider: EProvider.JOB_IN_JA,
        }),
        createCrawledJob({
          url: 'https://example.com/jobs/2',
          provider: EProvider.LINKED_IN,
        }),
        createCrawledJob({
          url: 'https://example.com/jobs/3',
          provider: EProvider.LINKED_IN,
        }),
      ])

      const result = await repository.count({
        provider: EProvider.LINKED_IN,
      })

      expect(result).toBe(2)
    })

    it('applies multiple filters when counting jobs', async () => {
      await repository.createMany([
        createCrawledJob({
          url: 'https://example.com/jobs/1',
          provider: EProvider.JOB_IN_JA,
          contractType: EContractType.PART_TIME,
        }),
        createCrawledJob({
          url: 'https://example.com/jobs/2',
          provider: EProvider.JOB_IN_JA,
          contractType: EContractType.FULL_TIME,
        }),
        createCrawledJob({
          url: 'https://example.com/jobs/3',
          provider: EProvider.LINKED_IN,
          contractType: EContractType.PART_TIME,
        }),
      ])

      const result = await repository.count({
        provider: EProvider.JOB_IN_JA,
        contractType: EContractType.PART_TIME,
      })

      expect(result).toBe(1)
    })
  })

  describe('delete', () => {
    it('deletes and returns the job', async () => {
      const createdJob = await repository.create(createCrawledJob())

      const deletedJob = await repository.delete(createdJob.id)

      expect(deletedJob.id).toBe(createdJob.id)

      expect(await repository.findById(createdJob.id)).toBeNull()

      expect(await prisma.job.count()).toBe(0)
    })

    it('does not delete the related company and location', async () => {
      const createdJob = await repository.create(createCrawledJob())

      await repository.delete(createdJob.id)

      expect(await prisma.company.count()).toBe(1)
      expect(await prisma.location.count()).toBe(1)
    })
  })
})
