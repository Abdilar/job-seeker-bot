import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { IJobRepository } from '../../repositories'
import type { ICrawledJob, IJob, IJobFilter } from '../../types'
import { EContractType, EProvider } from '../../types'
import { JobService } from './job.service'

const createCrawledJob = (overrides: Partial<ICrawledJob> = {}): ICrawledJob => ({
  title: 'Senior Frontend Engineer',
  url: 'https://example.com/jobs/123',
  contractType: EContractType.FULL_TIME,
  provider: EProvider.JOB_IN_JA,
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
  id: 'job-123',
  ...overrides,
})

describe('JobService', () => {
  const createMock = vi.fn<IJobRepository['create']>()
  const createManyMock = vi.fn<IJobRepository['createMany']>()
  const deleteMock = vi.fn<IJobRepository['delete']>()
  const findByIdMock = vi.fn<IJobRepository['findById']>()
  const findByUrlMock = vi.fn<IJobRepository['findByUrl']>()
  const findAllMock = vi.fn<IJobRepository['findAll']>()
  const findPaginatedMock = vi.fn<IJobRepository['findPaginated']>()
  const existsMock = vi.fn<IJobRepository['exists']>()
  const countMock = vi.fn<IJobRepository['count']>()

  const repository: IJobRepository = {
    create: createMock,
    createMany: createManyMock,
    delete: deleteMock,
    findById: findByIdMock,
    findByUrl: findByUrlMock,
    findAll: findAllMock,
    findPaginated: findPaginatedMock,
    exists: existsMock,
    count: countMock,
  }

  const service = new JobService(repository)

  beforeEach(() => {
    vi.resetAllMocks()
    createManyMock.mockResolvedValue(undefined)

    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('save', () => {
    it('saves a valid job', async () => {
      const data = createCrawledJob()
      const savedJob = createJob()
      createMock.mockResolvedValue(savedJob)
      const result = await service.save(data)

      expect(createMock).toHaveBeenCalledExactlyOnceWith(data)
      expect(result).toEqual(savedJob)
    })

    it('rejects an invalid job without calling repository', async () => {
      const data = createCrawledJob({ title: '' })

      await expect(service.save(data)).rejects.toThrow('Failed saving job operation!')
      expect(createMock).not.toHaveBeenCalled()
    })

    it('handles repository errors', async () => {
      createMock.mockRejectedValue(new Error('Database unavailable'))

      await expect(service.save(createCrawledJob())).rejects.toThrow('Failed saving job operation!')
    })
  })

  describe('saveAll', () => {
    it('saves all valid jobs', async () => {
      const jobs = [
        createCrawledJob(),
        createCrawledJob({
          url: 'https://example.com/jobs/456',
        }),
      ]

      const result = await service.saveAll(jobs)

      expect(createManyMock).toHaveBeenCalledExactlyOnceWith(jobs)
      expect(result).toEqual({
        total: 2,
        saved: 2,
        failed: 0,
      })
    })

    it('filters invalid jobs before saving', async () => {
      const validJob = createCrawledJob()
      const invalidJob = createCrawledJob({ title: '' })
      const result = await service.saveAll([validJob, invalidJob])

      expect(createManyMock).toHaveBeenCalledExactlyOnceWith([validJob])
      expect(result).toEqual({
        total: 2,
        saved: 1,
        failed: 1,
      })
    })

    it('handles an empty array', async () => {
      const result = await service.saveAll([])

      expect(createManyMock).toHaveBeenCalledExactlyOnceWith([])
      expect(result).toEqual({
        total: 0,
        saved: 0,
        failed: 0,
      })
    })

    it('propagates repository errors', async () => {
      createManyMock.mockRejectedValue(new Error('Database unavailable'))

      await expect(service.saveAll([createCrawledJob()])).rejects.toThrow('Database unavailable')
    })
  })

  describe('isValid', () => {
    it('accepts a valid job', () => {
      expect(service.isValid(createCrawledJob())).toBe(true)
    })

    it.each([
      ['title', { title: '' }],
      ['contractType', { contractType: undefined }],
      ['company', { company: { fullName: '' } }],
      ['location', { location: { country: '' } }],
      ['provider', { provider: undefined }],
      ['url', { url: 'invalid-url' }],
    ])('rejects invalid %s', (_field, overrides) => {
      const job = createCrawledJob({
        ...overrides,
      } as Partial<ReturnType<typeof createCrawledJob>>)

      expect(service.isValid(job)).toBe(false)
    })
  })

  describe('getJobs', () => {
    it('forwards pagination and filters', async () => {
      const jobs = [createJob()]
      const filter: IJobFilter = {
        provider: EProvider.JOB_IN_JA,
      }
      findPaginatedMock.mockResolvedValue(jobs)
      const result = await service.getJobs(2, 10, filter)

      expect(findPaginatedMock).toHaveBeenCalledExactlyOnceWith(2, 10, filter)
      expect(result).toEqual(jobs)
    })
  })

  describe('getJob', () => {
    it('returns an existing job', async () => {
      const job = createJob()
      findByIdMock.mockResolvedValue(job)
      const result = await service.getJob('job-123')

      expect(findByIdMock).toHaveBeenCalledExactlyOnceWith('job-123')
      expect(result).toEqual(job)
    })

    it('returns null when job does not exist', async () => {
      findByIdMock.mockResolvedValue(null)
      const result = await service.getJob('missing-job')

      expect(result).toBeNull()
    })
  })

  describe('count', () => {
    it('forwards filters and returns count', async () => {
      const filter: IJobFilter = {
        contractType: EContractType.FULL_TIME,
      }
      countMock.mockResolvedValue(15)
      const result = await service.count(filter)

      expect(countMock).toHaveBeenCalledExactlyOnceWith(filter)
      expect(result).toBe(15)
    })
  })
})
