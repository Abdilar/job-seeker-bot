import { describe, expect, it } from 'vitest'
import { EContractType, EProvider, type IJob } from '../../../types'
import { PAGINATION_LIMIT } from '../../constants'
import { JobListKeyboard } from './job-list.keyboard'

const createJob = (id: string): IJob => ({
  id,
  title: `Job ${id}`,
  url: `https://example.com/jobs/${id}`,
  contractType: EContractType.FULL_TIME,
  provider: EProvider.JOB_IN_JA,
  company: {
    fullName: 'Example Company',
  },
  location: {
    country: 'Iran',
    province: 'Tehran',
  },
})

describe('JobListKeyboard', () => {
  const keyboard = new JobListKeyboard()

  it('creates a button for each job', () => {
    const result = keyboard.create([createJob('job-1'), createJob('job-2')], 1)

    expect(result.inline_keyboard).toEqual([
      [
        {
          text: '1',
          callback_data: 'jobs:job-1:1',
        },
        {
          text: '2',
          callback_data: 'jobs:job-2:1',
        },
      ],
    ])
  })

  it('uses the page number when calculating job indexes', () => {
    const result = keyboard.create([createJob('job-1'), createJob('job-2')], 2)

    expect(result.inline_keyboard[0]?.[0]).toEqual({
      text: String(PAGINATION_LIMIT + 1),
      callback_data: 'jobs:job-1:2',
    })
    expect(result.inline_keyboard[0]?.[1]).toEqual({
      text: String(PAGINATION_LIMIT + 2),
      callback_data: 'jobs:job-2:2',
    })
  })

  it('starts a new row after every five jobs', () => {
    const jobs = Array.from({ length: 6 }, (_, index) => createJob(`job-${index + 1}`))

    const result = keyboard.create(jobs, 1)

    expect(result.inline_keyboard).toHaveLength(2)
    expect(result.inline_keyboard[0]).toHaveLength(5)
    expect(result.inline_keyboard[1]).toHaveLength(1)
    expect(result.inline_keyboard[0]?.map((button) => button.text)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ])
    expect(result.inline_keyboard[1]?.[0]?.text).toBe('6')
  })
})
