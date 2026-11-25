import { describe, expect, it } from 'vitest'
import { InlineKeyboard } from 'grammy'
import type { IJob } from '../../../types'
import { PAGINATION_LIMIT } from '../../constants'
import { JobListKeyboard } from './job-list.keyboard'

describe('JobListKeyboard', () => {
  const jobListKeyboard = new JobListKeyboard()

  const createJobs = (count: number): IJob[] => {
    return Array.from({ length: count }, (_, index) => ({
      id: `job-${index + 1}`,
      title: `Job ${index + 1}`,
    })) as IJob[]
  }

  describe('create', () => {
    it('should return an instance of InlineKeyboard', () => {
      const keyboard = jobListKeyboard.create(createJobs(1), 1)

      expect(keyboard).toBeInstanceOf(InlineKeyboard)
    })

    it('should return an empty keyboard when jobs are empty', () => {
      const keyboard = jobListKeyboard.create([], 1)

      expect(keyboard.inline_keyboard.flat()).toEqual([])
    })

    it('should create a button for each job', () => {
      const jobs = createJobs(3)

      const keyboard = jobListKeyboard.create(jobs, 1)

      expect(keyboard.inline_keyboard.flat()).toHaveLength(3)
    })

    it('should generate correct button text and callback data', () => {
      const jobs = createJobs(3)

      const keyboard = jobListKeyboard.create(jobs, 1)

      expect(keyboard.inline_keyboard).toEqual([
        [
          {
            text: '1',
            callback_data: 'jobs:job-1:1',
          },
          {
            text: '2',
            callback_data: 'jobs:job-2:1',
          },
          {
            text: '3',
            callback_data: 'jobs:job-3:1',
          },
        ],
      ])
    })

    it('should calculate job indexes based on the current page', () => {
      const jobs = createJobs(3)
      const page = 2

      const keyboard = jobListKeyboard.create(jobs, page)

      expect(keyboard.inline_keyboard.flat()).toEqual([
        {
          text: `${PAGINATION_LIMIT + 1}`,
          callback_data: 'jobs:job-1:2',
        },
        {
          text: `${PAGINATION_LIMIT + 2}`,
          callback_data: 'jobs:job-2:2',
        },
        {
          text: `${PAGINATION_LIMIT + 3}`,
          callback_data: 'jobs:job-3:2',
        },
      ])
    })

    it('should create a new row after every five buttons', () => {
      const jobs = createJobs(7)

      const keyboard = jobListKeyboard.create(jobs, 1)

      expect(keyboard.inline_keyboard).toHaveLength(2)
      expect(keyboard.inline_keyboard[0]).toHaveLength(5)
      expect(keyboard.inline_keyboard[1]).toHaveLength(2)
    })

    it.each([
      [1, [1]],
      [4, [4]],
      [5, [5]],
      [6, [5, 1]],
      [10, [5, 5]],
      [11, [5, 5, 1]],
      [15, [5, 5, 5]],
      [16, [5, 5, 5, 1]],
    ])('should organize %i jobs into rows correctly', (jobCount, expectedRows) => {
      const jobs = createJobs(jobCount)

      const keyboard = jobListKeyboard.create(jobs, 1)

      const rows = keyboard.inline_keyboard.filter((row) => row.length > 0).map((row) => row.length)

      expect(rows).toEqual(expectedRows)
    })

    it.each([1, 2, 3, 5, 10])('should generate correct indexes for page %i', (page) => {
      const jobs = createJobs(3)

      const keyboard = jobListKeyboard.create(jobs, page)

      const expectedButtons = jobs.map((job, index) => ({
        text: `${index + 1 + (page - 1) * PAGINATION_LIMIT}`,
        callback_data: `jobs:${job.id}:${page}`,
      }))

      expect(keyboard.inline_keyboard.flat()).toEqual(expectedButtons)
    })

    it('should preserve the original order of jobs', () => {
      const jobs = [{ id: 'job-c' }, { id: 'job-a' }, { id: 'job-b' }] as IJob[]

      const keyboard = jobListKeyboard.create(jobs, 1)

      expect(keyboard.inline_keyboard.flat()).toEqual([
        {
          text: '1',
          callback_data: 'jobs:job-c:1',
        },
        {
          text: '2',
          callback_data: 'jobs:job-a:1',
        },
        {
          text: '3',
          callback_data: 'jobs:job-b:1',
        },
      ])
    })

    it('should create a new keyboard on every call', () => {
      const jobs = createJobs(3)

      const firstKeyboard = jobListKeyboard.create(jobs, 1)
      const secondKeyboard = jobListKeyboard.create(jobs, 1)

      expect(firstKeyboard).not.toBe(secondKeyboard)

      expect(firstKeyboard.inline_keyboard).toEqual(secondKeyboard.inline_keyboard)
    })
  })
})
