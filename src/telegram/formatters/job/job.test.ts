import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IJob } from '../../../types'
import { toJalali } from '../../../utilities'
import {
  CONTRACT_TYPE_MAP,
  EDUCATION_MAP,
  GENDER_MAP,
  PAGINATION_LIMIT,
  PROVIDER_MAP,
  VISA_SPONSORSHIP_MAP,
  WORK_MODE_MAP,
} from '../../constants'
import { JobFormatter } from './job.formatter'

vi.mock('../../../utilities', () => ({
  toJalali: vi.fn(),
}))

type JobDetail = NonNullable<IJob['detail']>

describe('JobFormatter', () => {
  let formatter: JobFormatter

  const contractType = Object.keys(CONTRACT_TYPE_MAP)[0] as IJob['contractType']

  const provider = Object.keys(PROVIDER_MAP)[0] as IJob['provider']

  const education = Object.keys(EDUCATION_MAP)[0] as NonNullable<JobDetail['education']>

  const gender = Object.keys(GENDER_MAP)[0] as NonNullable<JobDetail['gender']>

  const workMode = Object.keys(WORK_MODE_MAP)[0] as NonNullable<JobDetail['workMode']>

  const visaSponsorship = Object.keys(VISA_SPONSORSHIP_MAP)[0] as NonNullable<
    JobDetail['visaSponsorship']
  >

  const postedAt = new Date('2026-01-01T10:00:00Z')
  const jalaliDate = '1404/10/11'

  const createJob = (overrides: Partial<IJob> = {}): IJob => ({
    id: 'job-1',
    title: 'Frontend Developer',
    url: 'https://example.com/jobs/1',
    contractType,
    provider,
    postedAt,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    company: {
      fullName: 'Example Company',
    },
    location: {
      country: 'Iran',
      province: 'Tehran',
    },
    ...overrides,
  })

  const createJobDetail = (overrides: Partial<JobDetail> = {}): JobDetail => ({
    id: 'detail-1',
    description: 'We are looking for a frontend developer.',
    category: 'Software Engineering',
    responsibilities: ['Develop user interfaces', 'Write unit tests'],
    requirements: ['Experience with React', 'Knowledge of TypeScript'],
    preferredQualifications: ['Experience with Next.js'],
    skills: ['React', 'TypeScript', 'JavaScript'],
    benefits: ['Health insurance', 'Flexible working hours'],
    salary: '50,000,000 Toman',
    experience: {
      raw: '3 years',
      minYears: 3,
    },
    education,
    gender,
    workMode,
    visaSponsorship,
    applicationUrl: 'https://example.com/apply/1',
    ...overrides,
  })

  beforeEach(() => {
    vi.resetAllMocks()

    formatter = new JobFormatter()

    vi.mocked(toJalali).mockReturnValue(jalaliDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatList', () => {
    it('should return a string', () => {
      const result = formatter.formatList([createJob()], 1, 1)

      expect(typeof result).toBe('string')
    })

    it('should format the job title using bold HTML tags', () => {
      const job = createJob()

      const result = formatter.formatList([job], 1, 1)

      expect(result).toContain(`<b>1. ${job.title}</b>`)
    })

    it('should include the company name', () => {
      const job = createJob()

      const result = formatter.formatList([job], 1, 1)

      expect(result).toContain(job.company.fullName)
    })

    it('should include the mapped contract type', () => {
      const job = createJob()

      const result = formatter.formatList([job], 1, 1)

      expect(result).toContain(CONTRACT_TYPE_MAP[job.contractType])
    })

    it('should format multiple jobs', () => {
      const jobs = [
        createJob({
          id: 'job-1',
          title: 'Frontend Developer',
        }),
        createJob({
          id: 'job-2',
          title: 'Backend Developer',
        }),
        createJob({
          id: 'job-3',
          title: 'Software Engineer',
        }),
      ]

      const result = formatter.formatList(jobs, 1, 1)

      expect(result).toContain('<b>1. Frontend Developer</b>')
      expect(result).toContain('<b>2. Backend Developer</b>')
      expect(result).toContain('<b>3. Software Engineer</b>')
    })

    it('should preserve the original order of jobs', () => {
      const jobs = [
        createJob({ title: 'Frontend Developer' }),
        createJob({ title: 'Backend Developer' }),
        createJob({ title: 'Software Engineer' }),
      ]

      const result = formatter.formatList(jobs, 1, 1)

      expect(result.indexOf('Frontend Developer')).toBeLessThan(result.indexOf('Backend Developer'))

      expect(result.indexOf('Backend Developer')).toBeLessThan(result.indexOf('Software Engineer'))
    })

    it.each([
      [1, 1],
      [2, PAGINATION_LIMIT + 1],
      [3, PAGINATION_LIMIT * 2 + 1],
      [5, PAGINATION_LIMIT * 4 + 1],
    ])('should start numbering page %i from %i', (page, expectedIndex) => {
      const job = createJob()

      const result = formatter.formatList([job], page, 10)

      expect(result).toContain(`<b>${expectedIndex}. ${job.title}</b>`)
    })

    it('should increment job indexes on subsequent pages', () => {
      const jobs = [
        createJob({ title: 'Frontend Developer' }),
        createJob({ title: 'Backend Developer' }),
      ]

      const result = formatter.formatList(jobs, 2, 5)

      expect(result).toContain(`<b>${PAGINATION_LIMIT + 1}. Frontend Developer</b>`)

      expect(result).toContain(`<b>${PAGINATION_LIMIT + 2}. Backend Developer</b>`)
    })

    it('should append pagination information', () => {
      const result = formatter.formatList([createJob()], 2, 10)

      expect(result).toContain('صفحه 2 از 10')
      expect(result.endsWith('صفحه 2 از 10')).toBe(true)
    })

    it('should return only pagination information when jobs are empty', () => {
      const result = formatter.formatList([], 1, 1)

      expect(result.trim()).toBe('صفحه 1 از 1')
    })
  })

  describe('formatDetail - basic information', () => {
    it('should format the job title using bold HTML tags', () => {
      const job = createJob()

      const result = formatter.formatDetail(job)

      expect(result).toContain(`<b>${job.title}</b>`)
    })

    it('should include the company name', () => {
      const job = createJob()

      const result = formatter.formatDetail(job)

      expect(result).toContain(job.company.fullName)
    })

    it('should include the job category when available', () => {
      const job = createJob({
        detail: createJobDetail(),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain('| Software Engineering')
    })

    it('should include visa sponsorship when available', () => {
      const job = createJob({
        detail: createJobDetail(),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain(`| ${VISA_SPONSORSHIP_MAP[visaSponsorship]}`)
    })

    it('should include the job description', () => {
      const job = createJob({
        detail: createJobDetail({
          description: 'Custom job description',
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain('Custom job description')
    })

    it('should omit the category and visa sponsorship when unavailable', () => {
      const job = createJob({
        detail: createJobDetail({
          category: undefined,
          visaSponsorship: undefined,
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).not.toContain('|')
    })
  })

  describe('formatDetail - list attributes', () => {
    const listAttributes = [
      ['responsibilities', 'مسئولیت‌ها'],
      ['requirements', 'نیازمندی‌ها'],
      ['preferredQualifications', 'شرایط احراز'],
      ['skills', 'مهارت‌ها'],
      ['benefits', 'مزایا'],
    ] as const

    it.each(listAttributes)('should format the %s list', (attribute, label) => {
      const job = createJob({
        detail: createJobDetail({
          [attribute]: ['First item', 'Second item'],
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain(`${label}\n- First item\n- Second item\n\n`)
    })

    it.each(listAttributes)(
      'should omit the %s section when the list is empty',
      (attribute, label) => {
        const job = createJob({
          detail: createJobDetail({
            [attribute]: [],
          }),
        })

        const result = formatter.formatDetail(job)

        expect(result).not.toContain(label)
      },
    )

    it.each(listAttributes)(
      'should omit the %s section when the list is undefined',
      (attribute, label) => {
        const job = createJob({
          detail: createJobDetail({
            [attribute]: undefined,
          }),
        })

        const result = formatter.formatDetail(job)

        expect(result).not.toContain(label)
      },
    )

    it('should format a list containing a single item', () => {
      const job = createJob({
        detail: createJobDetail({
          skills: ['TypeScript'],
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain('مهارت‌ها\n- TypeScript\n\n')
    })

    it('should not insert commas between list items', () => {
      const job = createJob({
        detail: createJobDetail({
          skills: ['React', 'TypeScript', 'JavaScript'],
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain('مهارت‌ها\n- React\n- TypeScript\n- JavaScript\n\n')

      expect(result).not.toContain('React,TypeScript')
    })
  })

  describe('formatDetail - mapped attributes', () => {
    it('should include the mapped work mode', () => {
      const job = createJob({
        detail: createJobDetail(),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain(`💼 شیوه کار: <b>${WORK_MODE_MAP[workMode]}</b>\n\n`)
    })

    it('should omit work mode when unavailable', () => {
      const job = createJob({
        detail: createJobDetail({
          workMode: undefined,
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).not.toContain('💼 شیوه کار')
    })

    it('should include the mapped education level', () => {
      const job = createJob({
        detail: createJobDetail(),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain(`📚 تحصیلات: <b>${EDUCATION_MAP[education]}</b>\n\n`)
    })

    it('should use the default education value when unavailable', () => {
      const job = createJob({
        detail: createJobDetail({
          education: undefined,
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain('📚 تحصیلات: <b>مهم نیست</b>\n\n')
    })

    it('should include the mapped gender', () => {
      const job = createJob({
        detail: createJobDetail(),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain(`👨🏻‍💼 جنسیت: <b>${GENDER_MAP[gender]}</b>\n\n`)
    })

    it('should use the default gender value when unavailable', () => {
      const job = createJob({
        detail: createJobDetail({
          gender: undefined,
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain('👨🏻‍💼 جنسیت: <b>مهم نیست</b>\n\n')
    })

    it('should include the mapped contract type', () => {
      const job = createJob()

      const result = formatter.formatDetail(job)

      expect(result).toContain(`📄 نوع قرارداد: <b>${CONTRACT_TYPE_MAP[contractType]}</b>`)
    })

    it('should include the mapped provider', () => {
      const job = createJob()

      const result = formatter.formatDetail(job)

      expect(result).toContain(`🌐 منبع: <b>${PROVIDER_MAP[provider]}</b>`)
    })
  })

  describe('formatDetail - experience', () => {
    it('should include the raw experience value', () => {
      const job = createJob({
        detail: createJobDetail({
          experience: {
            raw: '3 years',
            minYears: 3,
          },
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain('📈 سابقه: <b>3 years</b>\n\n')
    })

    it('should omit experience when unavailable', () => {
      const job = createJob({
        detail: createJobDetail({
          experience: undefined,
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).not.toContain('📈 سابقه')
    })

    it('should omit experience when the raw value is unavailable', () => {
      const job = createJob({
        detail: createJobDetail({
          experience: {
            minYears: 3,
            maxYears: 5,
          },
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).not.toContain('📈 سابقه')
    })

    it('should omit experience when the raw value is empty', () => {
      const job = createJob({
        detail: createJobDetail({
          experience: {
            raw: '',
          },
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).not.toContain('📈 سابقه')
    })
  })

  describe('formatDetail - salary', () => {
    it('should include the salary', () => {
      const job = createJob({
        detail: createJobDetail({
          salary: '50,000,000 Toman',
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain('💰 حقوق: <b>50,000,000 Toman</b>\n\n')
    })

    it('should omit salary when unavailable', () => {
      const job = createJob({
        detail: createJobDetail({
          salary: undefined,
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).not.toContain('💰 حقوق')
    })

    it('should omit salary when the value is empty', () => {
      const job = createJob({
        detail: createJobDetail({
          salary: '',
        }),
      })

      const result = formatter.formatDetail(job)

      expect(result).not.toContain('💰 حقوق')
    })
  })

  describe('formatDetail - location', () => {
    it('should include the country and province', () => {
      const job = createJob({
        location: {
          country: 'Iran',
          province: 'Tehran',
        },
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain('📍 موقعیت: <b>Iran, Tehran</b>\n\n')
    })
  })

  describe('formatDetail - publication date', () => {
    it('should convert the publication date to Jalali', () => {
      const job = createJob({ postedAt })

      formatter.formatDetail(job)

      expect(toJalali).toHaveBeenCalledTimes(1)
      expect(toJalali).toHaveBeenCalledWith(postedAt)
    })

    it('should include the formatted Jalali date', () => {
      const job = createJob()

      const result = formatter.formatDetail(job)

      expect(result).toContain(`📅 تاریخ انتشار: <b>${jalaliDate}</b>\n\n`)
    })

    it('should use the current date when postedAt is unavailable', () => {
      const currentDate = new Date('2026-02-01T12:00:00Z')

      vi.useFakeTimers()
      vi.setSystemTime(currentDate)

      const job = createJob({
        postedAt: undefined,
      })

      formatter.formatDetail(job)

      expect(toJalali).toHaveBeenCalledWith(currentDate)
    })
  })

  describe('formatDetail - missing details', () => {
    it('should format a job without details without throwing an error', () => {
      const job = createJob({
        detail: undefined,
      })

      expect(() => formatter.formatDetail(job)).not.toThrow()
    })

    it('should include basic information when details are unavailable', () => {
      const job = createJob({
        detail: undefined,
      })

      const result = formatter.formatDetail(job)

      expect(result).toContain(`<b>${job.title}</b>`)
      expect(result).toContain(job.company.fullName)

      expect(result).toContain('📍 موقعیت: <b>Iran, Tehran</b>')

      expect(result).toContain('📚 تحصیلات: <b>مهم نیست</b>')

      expect(result).toContain('👨🏻‍💼 جنسیت: <b>مهم نیست</b>')
    })

    it('should omit optional sections when details are unavailable', () => {
      const job = createJob({
        detail: undefined,
      })

      const result = formatter.formatDetail(job)

      expect(result).not.toContain('مسئولیت‌ها')
      expect(result).not.toContain('نیازمندی‌ها')
      expect(result).not.toContain('شرایط احراز')
      expect(result).not.toContain('مهارت‌ها')
      expect(result).not.toContain('مزایا')
      expect(result).not.toContain('💼 شیوه کار')
      expect(result).not.toContain('📈 سابقه')
      expect(result).not.toContain('💰 حقوق')
    })
  })
})
