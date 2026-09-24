import { describe, expect, it, vi } from 'vitest'
import type { IJobRepository } from '../../repositories'
import type { ICrawledJob } from '../../types'
import { JobService } from './job.service'

describe('JobService', () => {
  const repository = {
    create: vi.fn(),
    createMany: vi.fn(),
    findPaginated: vi.fn(),
    findById: vi.fn(),
    count: vi.fn(),
  } as unknown as IJobRepository

  const service = new JobService(repository)

  const createJob = (overrides: Partial<ICrawledJob> = {}): ICrawledJob =>
    ({
      title: 'Frontend Engineer',
      contractType: 'FULL_TIME',
      company: {
        fullName: 'Example Company',
      },
      location: {
        country: 'Iran',
      },
      provider: 'JOB_IN_JA',
      url: 'https://example.com/jobs/123',
      ...overrides,
    }) as ICrawledJob

  describe('isValid', () => {
    it('returns true for a valid job', () => {
      const job = createJob()

      expect(service.isValid(job)).toBe(true)
    })

    it.each([
      ['title', { title: '' }],
      ['contractType', { contractType: '' }],
      ['company', { company: { fullName: '' } }],
      ['location', { location: { country: '' } }],
      ['provider', { provider: '' }],
      ['url', { url: 'invalid-url' }],
    ])('returns false when %s is invalid', (_field, overrides) => {
      const job = createJob(overrides as Partial<ICrawledJob>)

      expect(service.isValid(job)).toBe(false)
    })
  })
})
