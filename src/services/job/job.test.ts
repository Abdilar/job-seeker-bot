import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EContractType, EProvider } from '../../types'
import type { ICrawledJob, ICrawledJobDetail, IJob, IJobDetail, IJobFilter } from '../../types'
import type { IJobRepository } from '../../repositories/job'
import { JobService } from './job.service'

describe('JobService', () => {
  let service: JobService

  const repository = {
    create: vi.fn<IJobRepository['create']>(),
    createMany: vi.fn<IJobRepository['createMany']>(),
    updateDetail: vi.fn<IJobRepository['updateDetail']>(),
    findPaginated: vi.fn<IJobRepository['findPaginated']>(),
    findJobsWithoutDetail: vi.fn<IJobRepository['findJobsWithoutDetail']>(),
    findById: vi.fn<IJobRepository['findById']>(),
    findLatestByProvider: vi.fn<IJobRepository['findLatestByProvider']>(),
    count: vi.fn<IJobRepository['count']>(),
    delete: vi.fn<IJobRepository['delete']>(),
    findByUrl: vi.fn<IJobRepository['findByUrl']>(),
    findAll: vi.fn<IJobRepository['findAll']>(),
    exists: vi.fn<IJobRepository['exists']>(),
  } satisfies IJobRepository

  const provider = EProvider.JOB_IN_JA
  const contractType = EContractType.FULL_TIME
  const date = new Date('2026-01-01T10:00:00Z')

  const createCrawledJobDetail = (
    overrides: Partial<ICrawledJobDetail> = {},
  ): ICrawledJobDetail => ({
    description: 'Frontend developer job description',
    category: 'Software Engineering',
    responsibilities: ['Develop user interfaces'],
    requirements: ['Experience with React'],
    preferredQualifications: ['Experience with Next.js'],
    skills: ['React', 'TypeScript'],
    benefits: ['Health insurance'],
    applicationUrl: 'https://example.com/apply/1',
    ...overrides,
  })

  const createCrawledJob = (overrides: Partial<ICrawledJob> = {}): ICrawledJob => ({
    title: 'Frontend Developer',
    url: 'https://example.com/jobs/1',
    contractType,
    provider,
    postedAt: date,
    company: {
      fullName: 'Example Company',
    },
    location: {
      country: 'Iran',
      province: 'Tehran',
    },
    ...overrides,
  })

  const createJob = (overrides: Partial<IJob> = {}): IJob => ({
    ...createCrawledJob(),
    id: 'job-1',
    createdAt: date,
    updatedAt: date,
    detail: undefined,
    ...overrides,
  })

  const createJobDetail = (overrides: Partial<IJobDetail> = {}): IJobDetail => ({
    ...createCrawledJobDetail(),
    id: 'detail-1',
    responsibilities: ['Develop user interfaces'],
    requirements: ['Experience with React'],
    preferredQualifications: ['Experience with Next.js'],
    skills: ['React', 'TypeScript'],
    benefits: ['Health insurance'],
    ...overrides,
  })

  beforeEach(() => {
    vi.resetAllMocks()

    vi.spyOn(console, 'log').mockImplementation(() => {})

    service = new JobService(repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isValid', () => {
    it('should return true for a valid job', () => {
      const job = createCrawledJob()

      expect(service.isValid(job)).toBe(true)
    })

    it('should return false when the title is empty', () => {
      const job = createCrawledJob({
        title: '',
      })

      expect(service.isValid(job)).toBe(false)
    })

    it('should return false when the contract type is empty', () => {
      const job = createCrawledJob({
        contractType: '' as EContractType,
      })

      expect(service.isValid(job)).toBe(false)
    })

    it('should return false when the company name is empty', () => {
      const job = createCrawledJob({
        company: {
          fullName: '',
        },
      })

      expect(service.isValid(job)).toBe(false)
    })

    it('should return false when the country is empty', () => {
      const job = createCrawledJob({
        location: {
          country: '',
          province: 'Tehran',
        },
      })

      expect(service.isValid(job)).toBe(false)
    })

    it('should return false when the provider is empty', () => {
      const job = createCrawledJob({
        provider: '' as EProvider,
      })

      expect(service.isValid(job)).toBe(false)
    })

    it.each(['', 'invalid-url', 'example.com/jobs/1', 'https://', '/jobs/1'])(
      'should return false for an invalid URL: "%s"',
      (url) => {
        const job = createCrawledJob({ url })

        expect(service.isValid(job)).toBe(false)
      },
    )

    it.each([
      'https://example.com/jobs/1',
      'http://example.com/jobs/1',
      'https://example.com/jobs/1?source=telegram',
    ])('should return true for a valid URL: "%s"', (url) => {
      const job = createCrawledJob({ url })

      expect(service.isValid(job)).toBe(true)
    })

    it('should return false when job data is undefined', () => {
      expect(service.isValid(undefined as unknown as ICrawledJob)).toBe(false)
    })

    it('should return true when job details are unavailable', () => {
      const job = createCrawledJob()

      expect(job.detail).toBeUndefined()
      expect(service.isValid(job)).toBe(true)
    })

    it('should not interact with the repository', () => {
      service.isValid(createCrawledJob())

      expect(repository.create).not.toHaveBeenCalled()
      expect(repository.createMany).not.toHaveBeenCalled()
    })
  })

  describe('save', () => {
    it('should save a valid job', async () => {
      const crawledJob = createCrawledJob()
      const savedJob = createJob()

      repository.create.mockResolvedValue(savedJob)

      const result = await service.save(crawledJob)

      expect(repository.create).toHaveBeenCalledTimes(1)
      expect(repository.create).toHaveBeenCalledWith(crawledJob)
      expect(result).toEqual(savedJob)
    })

    it('should not save an invalid job', async () => {
      const job = createCrawledJob({
        title: '',
      })

      await expect(service.save(job)).rejects.toThrow('Failed saving job operation!')

      expect(repository.create).not.toHaveBeenCalled()
    })

    it('should not save a job with an invalid URL', async () => {
      const job = createCrawledJob({
        url: 'invalid-url',
      })

      await expect(service.save(job)).rejects.toThrow('Failed saving job operation!')

      expect(repository.create).not.toHaveBeenCalled()
    })

    it('should throw a custom error when the repository fails', async () => {
      const job = createCrawledJob()

      repository.create.mockRejectedValue(new Error('Database connection failed'))

      await expect(service.save(job)).rejects.toThrow('Failed saving job operation!')

      expect(repository.create).toHaveBeenCalledWith(job)
    })
  })

  describe('saveAll', () => {
    it('should save all jobs when they are valid', async () => {
      const jobs = [
        createCrawledJob({
          title: 'Frontend Developer',
          url: 'https://example.com/jobs/1',
        }),
        createCrawledJob({
          title: 'Backend Developer',
          url: 'https://example.com/jobs/2',
        }),
      ]

      const result = await service.saveAll(jobs)

      expect(repository.createMany).toHaveBeenCalledTimes(1)
      expect(repository.createMany).toHaveBeenCalledWith(jobs)

      expect(result).toEqual({
        total: 2,
        saved: 2,
        failed: 0,
      })
    })

    it('should save only valid jobs', async () => {
      const firstJob = createCrawledJob({
        title: 'Frontend Developer',
      })

      const secondJob = createCrawledJob({
        title: '',
      })

      const thirdJob = createCrawledJob({
        title: 'Backend Developer',
        url: 'https://example.com/jobs/3',
      })

      const fourthJob = createCrawledJob({
        url: 'invalid-url',
      })

      const result = await service.saveAll([firstJob, secondJob, thirdJob, fourthJob])

      expect(repository.createMany).toHaveBeenCalledTimes(1)

      expect(repository.createMany).toHaveBeenCalledWith([firstJob, thirdJob])

      expect(result).toEqual({
        total: 4,
        saved: 2,
        failed: 2,
      })
    })

    it('should return zero saved jobs when all jobs are invalid', async () => {
      const jobs = [createCrawledJob({ title: '' }), createCrawledJob({ url: 'invalid-url' })]

      const result = await service.saveAll(jobs)

      expect(repository.createMany).toHaveBeenCalledWith([])

      expect(result).toEqual({
        total: 2,
        saved: 0,
        failed: 2,
      })
    })

    it('should handle an empty jobs array', async () => {
      const result = await service.saveAll([])

      expect(repository.createMany).toHaveBeenCalledTimes(1)
      expect(repository.createMany).toHaveBeenCalledWith([])

      expect(result).toEqual({
        total: 0,
        saved: 0,
        failed: 0,
      })
    })

    it('should preserve the original order of valid jobs', async () => {
      const firstJob = createCrawledJob({
        title: 'Job C',
      })

      const invalidJob = createCrawledJob({
        title: '',
      })

      const secondJob = createCrawledJob({
        title: 'Job A',
        url: 'https://example.com/jobs/2',
      })

      await service.saveAll([firstJob, invalidJob, secondJob])

      expect(repository.createMany).toHaveBeenCalledWith([firstJob, secondJob])
    })

    it('should not mutate the original jobs array', async () => {
      const validJob = createCrawledJob()
      const invalidJob = createCrawledJob({ title: '' })

      const jobs = [validJob, invalidJob]
      const originalJobs = structuredClone(jobs)

      await service.saveAll(jobs)

      expect(jobs).toEqual(originalJobs)
    })

    it('should not save jobs individually', async () => {
      await service.saveAll([createCrawledJob()])

      expect(repository.create).not.toHaveBeenCalled()
      expect(repository.createMany).toHaveBeenCalledTimes(1)
    })

    it('should propagate repository errors', async () => {
      const error = new Error('Failed to save multiple jobs')

      repository.createMany.mockRejectedValue(error)

      await expect(service.saveAll([createCrawledJob()])).rejects.toBe(error)
    })
  })

  describe('saveJobDetail', () => {
    it('should save job details using the specified job ID', async () => {
      const detail = createJobDetail()

      const updatedJob = createJob({
        detail: {
          ...detail,
          id: 'detail-1',
        },
      })

      repository.updateDetail.mockResolvedValue(updatedJob)

      const result = await service.saveJobDetail('job-1', detail)

      expect(repository.updateDetail).toHaveBeenCalledTimes(1)

      expect(repository.updateDetail).toHaveBeenCalledWith('job-1', detail)

      expect(result).toEqual(updatedJob)
    })

    it('should return the updated job from the repository', async () => {
      const detail = createJobDetail()
      const updatedJob = createJob()

      repository.updateDetail.mockResolvedValue(updatedJob)

      const result = await service.saveJobDetail('job-1', detail)

      expect(result).toBe(updatedJob)
    })

    it('should throw a custom error when updating details fails', async () => {
      repository.updateDetail.mockRejectedValue(new Error('Database update failed'))

      await expect(service.saveJobDetail('job-1', createJobDetail())).rejects.toThrow(
        'Failed updating job detail operation!',
      )
    })
  })

  describe('getJobs', () => {
    it('should return paginated jobs', async () => {
      const jobs = [createJob({ id: 'job-1' }), createJob({ id: 'job-2' })]

      repository.findPaginated.mockResolvedValue(jobs)

      const result = await service.getJobs(1, 10)

      expect(repository.findPaginated).toHaveBeenCalledTimes(1)

      expect(repository.findPaginated).toHaveBeenCalledWith(1, 10, undefined)

      expect(result).toEqual(jobs)
    })

    it('should pass filters to the repository', async () => {
      const filter: IJobFilter = {
        contractType,
        provider,
      }

      repository.findPaginated.mockResolvedValue([])

      await service.getJobs(2, 10, filter)

      expect(repository.findPaginated).toHaveBeenCalledWith(2, 10, filter)
    })

    it('should return an empty array when no jobs are found', async () => {
      repository.findPaginated.mockResolvedValue([])

      const result = await service.getJobs(1, 10)

      expect(result).toEqual([])
    })

    it('should propagate repository errors', async () => {
      const error = new Error('Failed to fetch jobs')

      repository.findPaginated.mockRejectedValue(error)

      await expect(service.getJobs(1, 10)).rejects.toBe(error)
    })
  })

  describe('getJobsWithoutDetail', () => {
    it('should return jobs without details for the specified provider', async () => {
      const jobs = [createJob({ id: 'job-1' }), createJob({ id: 'job-2' })]

      repository.findJobsWithoutDetail.mockResolvedValue(jobs)

      const result = await service.getJobsWithoutDetail(provider)

      expect(repository.findJobsWithoutDetail).toHaveBeenCalledTimes(1)

      expect(repository.findJobsWithoutDetail).toHaveBeenCalledWith(provider)

      expect(result).toEqual(jobs)
    })

    it('should return an empty array when no jobs are found', async () => {
      repository.findJobsWithoutDetail.mockResolvedValue([])

      const result = await service.getJobsWithoutDetail(provider)

      expect(result).toEqual([])
    })

    it('should propagate repository errors', async () => {
      const error = new Error('Failed to fetch jobs without detail')

      repository.findJobsWithoutDetail.mockRejectedValue(error)

      await expect(service.getJobsWithoutDetail(provider)).rejects.toBe(error)
    })
  })

  describe('getJob', () => {
    it('should return a job by its ID', async () => {
      const job = createJob()

      repository.findById.mockResolvedValue(job)

      const result = await service.getJob('job-1')

      expect(repository.findById).toHaveBeenCalledTimes(1)
      expect(repository.findById).toHaveBeenCalledWith('job-1')

      expect(result).toEqual(job)
    })

    it('should return null when the job is not found', async () => {
      repository.findById.mockResolvedValue(null)

      const result = await service.getJob('unknown-job')

      expect(result).toBeNull()
    })

    it('should propagate repository errors', async () => {
      const error = new Error('Failed to fetch job')

      repository.findById.mockRejectedValue(error)

      await expect(service.getJob('job-1')).rejects.toBe(error)
    })
  })

  describe('getLatestJobByProvider', () => {
    it('should return the latest job for the specified provider', async () => {
      const job = createJob()

      repository.findLatestByProvider.mockResolvedValue(job)

      const result = await service.getLatestJobByProvider(provider)

      expect(repository.findLatestByProvider).toHaveBeenCalledTimes(1)

      expect(repository.findLatestByProvider).toHaveBeenCalledWith(provider)

      expect(result).toEqual(job)
    })

    it('should return null when no job is found', async () => {
      repository.findLatestByProvider.mockResolvedValue(null)

      const result = await service.getLatestJobByProvider(provider)

      expect(result).toBeNull()
    })

    it('should propagate repository errors', async () => {
      const error = new Error('Failed to fetch latest job')

      repository.findLatestByProvider.mockRejectedValue(error)

      await expect(service.getLatestJobByProvider(provider)).rejects.toBe(error)
    })
  })

  describe('count', () => {
    it('should return the total number of jobs', async () => {
      repository.count.mockResolvedValue(100)

      const result = await service.count()

      expect(repository.count).toHaveBeenCalledTimes(1)
      expect(repository.count).toHaveBeenCalledWith(undefined)

      expect(result).toBe(100)
    })

    it('should count jobs using the specified filters', async () => {
      const filter: IJobFilter = {
        contractType,
        provider,
      }

      repository.count.mockResolvedValue(25)

      const result = await service.count(filter)

      expect(repository.count).toHaveBeenCalledWith(filter)
      expect(result).toBe(25)
    })

    it('should return zero when no jobs are found', async () => {
      repository.count.mockResolvedValue(0)

      const result = await service.count()

      expect(result).toBe(0)
    })

    it('should propagate repository errors', async () => {
      const error = new Error('Failed to count jobs')

      repository.count.mockRejectedValue(error)

      await expect(service.count()).rejects.toBe(error)
    })
  })
})
