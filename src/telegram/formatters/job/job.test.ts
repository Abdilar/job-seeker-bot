import { describe, expect, it } from 'vitest'
import { EContractType, EProvider, type IJob } from '../../../types'
import { JobFormatter } from './job.formatter'
import { PAGINATION_LIMIT } from '../../constants'

const createJob = (overrides: Partial<IJob> = {}): IJob => ({
  id: 'job-1',
  title: 'Senior Frontend Engineer',
  url: 'https://example.com/jobs/1',
  contractType: EContractType.FULL_TIME,
  provider: EProvider.JOB_IN_JA,
  salary: '50 میلیون تومان',
  postedAt: new Date('2026-09-20T10:00:00.000Z'),
  company: {
    fullName: 'Example Company',
  },
  location: {
    country: 'ایران',
    province: 'تهران',
  },
  ...overrides,
})

describe('JobFormatter', () => {
  const formatter = new JobFormatter()

  describe('formatList', () => {
    it('formats jobs with their title, company and contract type', () => {
      const result = formatter.formatList(
        [
          createJob({
            id: 'job-1',
            title: 'Frontend Engineer',
          }),
          createJob({
            id: 'job-2',
            title: 'React Developer',
          }),
        ],
        1,
        3,
      )

      expect(result).toContain('<b>1. Frontend Engineer</b>')
      expect(result).toContain('<b>2. React Developer</b>')
      expect(result).toContain('Example Company')
      expect(result).toContain('صفحه 1 از 3')
    })

    it('continues job numbering based on the current page', () => {
      const result = formatter.formatList(
        [
          createJob({
            title: 'Frontend Engineer',
          }),
        ],
        2,
        5,
      )

      expect(result).toContain(`<b>${PAGINATION_LIMIT + 1}. Frontend Engineer</b>`)
      expect(result).toContain('صفحه 2 از 5')
    })
  })

  describe('formatDetail', () => {
    it('formats complete job details', () => {
      const job = createJob()
      const result = formatter.formatDetail(job)

      expect(result).toContain('<b>💼 Senior Frontend Engineer</b>')
      expect(result).toContain('🏢 شرکت: <b>Example Company</b>')
      expect(result).toContain('📍 موقعیت: <b>ایران, تهران</b>')
      expect(result).toContain('💰 حقوق: <b>50 میلیون تومان</b>')
      expect(result).toContain('📄 نوع قرارداد:')
      expect(result).toContain('📅 تاریخ انتشار:')
      expect(result).toContain('🌐 منبع:')
    })

    it('shows unknown when salary is missing', () => {
      const job = createJob({
        salary: undefined,
      })

      const result = formatter.formatDetail(job)
      expect(result).toContain('💰 حقوق: <b>نامشخص</b>')
    })
  })
})
