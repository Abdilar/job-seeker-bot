import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Locator } from 'playwright'
import type { ICrawledJobDetail } from '../../types'
import type { IJobParserStrategy } from './job.model'
import { JobParser } from './job.parser'

describe('JobParser', () => {
  let jobParser: JobParser

  const content = {} as Locator
  const url = 'https://example.com/jobs/1'

  const createParserStrategy = () =>
    ({
      parseSummary: vi.fn<IJobParserStrategy['parseSummary']>(),
      parseDetail: vi.fn<IJobParserStrategy['parseDetail']>(),
    }) satisfies IJobParserStrategy

  const firstStrategy = createParserStrategy()
  const secondStrategy = createParserStrategy()

  const invalidStrategy = undefined as unknown as IJobParserStrategy

  const jobDetail: ICrawledJobDetail = {
    description: 'Frontend developer job description',
    category: 'Software Engineering',
    responsibilities: ['Develop user interfaces'],
    requirements: ['Experience with React'],
    preferredQualifications: ['Experience with Next.js'],
    skills: ['React', 'TypeScript'],
    benefits: ['Health insurance'],
    applicationUrl: url,
  }

  beforeEach(() => {
    vi.resetAllMocks()

    jobParser = new JobParser(firstStrategy)
  })

  describe('constructor', () => {
    it('should create a JobParser instance', () => {
      expect(jobParser).toBeInstanceOf(JobParser)
    })

    it('should use the strategy provided to the constructor', async () => {
      firstStrategy.parseDetail.mockResolvedValue(jobDetail)

      const result = await jobParser.parseDetail(content, url)

      expect(firstStrategy.parseDetail).toHaveBeenCalledTimes(1)
      expect(firstStrategy.parseDetail).toHaveBeenCalledWith(content, url)

      expect(result).toBe(jobDetail)
    })
  })

  describe('setParser', () => {
    it('should replace the current summary parser strategy', async () => {
      jobParser.setParser(secondStrategy)

      await jobParser.parseSummary(content)

      expect(firstStrategy.parseSummary).not.toHaveBeenCalled()

      expect(secondStrategy.parseSummary).toHaveBeenCalledTimes(1)
      expect(secondStrategy.parseSummary).toHaveBeenCalledWith(content)
    })

    it('should replace the current detail parser strategy', async () => {
      secondStrategy.parseDetail.mockResolvedValue(jobDetail)

      jobParser.setParser(secondStrategy)

      const result = await jobParser.parseDetail(content, url)

      expect(firstStrategy.parseDetail).not.toHaveBeenCalled()

      expect(secondStrategy.parseDetail).toHaveBeenCalledTimes(1)
      expect(secondStrategy.parseDetail).toHaveBeenCalledWith(content, url)

      expect(result).toBe(jobDetail)
    })

    it('should throw an error when the strategy is undefined', () => {
      expect(() => {
        jobParser.setParser(invalidStrategy)
      }).toThrow('The parser is invalid!')
    })

    it('should throw an error when the strategy is null', () => {
      const nullStrategy = null as unknown as IJobParserStrategy

      expect(() => {
        jobParser.setParser(nullStrategy)
      }).toThrow('The parser is invalid!')
    })

    it('should preserve the current strategy when setting an invalid strategy', async () => {
      expect(() => {
        jobParser.setParser(invalidStrategy)
      }).toThrow('The parser is invalid!')

      await jobParser.parseSummary(content)

      expect(firstStrategy.parseSummary).toHaveBeenCalledTimes(1)
      expect(firstStrategy.parseSummary).toHaveBeenCalledWith(content)
    })

    it('should allow switching between strategies multiple times', async () => {
      await jobParser.parseSummary(content)

      jobParser.setParser(secondStrategy)

      await jobParser.parseSummary(content)

      jobParser.setParser(firstStrategy)

      await jobParser.parseSummary(content)

      expect(firstStrategy.parseSummary).toHaveBeenCalledTimes(2)
      expect(secondStrategy.parseSummary).toHaveBeenCalledTimes(1)
    })

    it('should allow setting the same strategy again', async () => {
      jobParser.setParser(firstStrategy)

      await jobParser.parseSummary(content)

      expect(firstStrategy.parseSummary).toHaveBeenCalledTimes(1)
    })
  })

  describe('parseSummary', () => {
    it('should delegate summary parsing to the current strategy', async () => {
      await jobParser.parseSummary(content)

      expect(firstStrategy.parseSummary).toHaveBeenCalledTimes(1)
      expect(firstStrategy.parseSummary).toHaveBeenCalledWith(content)
    })

    it('should return the result provided by the strategy', async () => {
      const result = await jobParser.parseSummary(content)

      expect(result).toBe(await firstStrategy.parseSummary.mock.results[0]?.value)
    })

    it('should not call the detail parser', async () => {
      await jobParser.parseSummary(content)

      expect(firstStrategy.parseDetail).not.toHaveBeenCalled()
    })

    it('should pass the original content to the strategy', async () => {
      await jobParser.parseSummary(content)

      expect(firstStrategy.parseSummary.mock.calls[0]?.[0]).toBe(content)
    })

    it('should propagate errors thrown by the strategy', async () => {
      const error = new Error('Failed to parse summary')

      firstStrategy.parseSummary.mockRejectedValueOnce(error)

      await expect(jobParser.parseSummary(content)).rejects.toBe(error)
    })

    it('should throw an error when no strategy is available', async () => {
      const parser = new JobParser(invalidStrategy)

      await expect(parser.parseSummary(content)).rejects.toThrow(
        'Unsupported content in JobParser!',
      )
    })

    it('should allow parsing again after a strategy failure', async () => {
      firstStrategy.parseSummary.mockRejectedValueOnce(new Error('Failed to parse summary'))

      await expect(jobParser.parseSummary(content)).rejects.toThrow('Failed to parse summary')

      await jobParser.parseSummary(content)

      expect(firstStrategy.parseSummary).toHaveBeenCalledTimes(2)
    })
  })

  describe('parseDetail', () => {
    it('should delegate detail parsing to the current strategy', async () => {
      firstStrategy.parseDetail.mockResolvedValue(jobDetail)

      await jobParser.parseDetail(content, url)

      expect(firstStrategy.parseDetail).toHaveBeenCalledTimes(1)
      expect(firstStrategy.parseDetail).toHaveBeenCalledWith(content, url)
    })

    it('should return the parsed job detail', async () => {
      firstStrategy.parseDetail.mockResolvedValue(jobDetail)

      const result = await jobParser.parseDetail(content, url)

      expect(result).toEqual(jobDetail)
    })

    it('should return the original result without modification', async () => {
      firstStrategy.parseDetail.mockResolvedValue(jobDetail)

      const result = await jobParser.parseDetail(content, url)

      expect(result).toBe(jobDetail)
    })

    it('should return undefined when the strategy returns undefined', async () => {
      firstStrategy.parseDetail.mockResolvedValue(undefined)

      const result = await jobParser.parseDetail(content, url)

      expect(result).toBeUndefined()
    })

    it('should not call the summary parser', async () => {
      firstStrategy.parseDetail.mockResolvedValue(jobDetail)

      await jobParser.parseDetail(content, url)

      expect(firstStrategy.parseSummary).not.toHaveBeenCalled()
    })

    it('should pass the original content to the strategy', async () => {
      await jobParser.parseDetail(content, url)

      expect(firstStrategy.parseDetail.mock.calls[0]?.[0]).toBe(content)
    })

    it.each([
      'https://example.com/jobs/1',
      'https://example.com/jobs/2',
      'https://example.com/jobs/3?source=telegram',
    ])('should pass the original URL: %s', async (jobUrl) => {
      await jobParser.parseDetail(content, jobUrl)

      expect(firstStrategy.parseDetail).toHaveBeenCalledWith(content, jobUrl)
    })

    it('should propagate errors thrown by the strategy', async () => {
      const error = new Error('Failed to parse detail')

      firstStrategy.parseDetail.mockRejectedValueOnce(error)

      await expect(jobParser.parseDetail(content, url)).rejects.toBe(error)
    })

    it('should throw an error when no strategy is available', async () => {
      const parser = new JobParser(invalidStrategy)

      await expect(parser.parseDetail(content, url)).rejects.toThrow(
        'Unsupported content in JobParser!',
      )
    })

    it('should allow parsing again after a strategy failure', async () => {
      firstStrategy.parseDetail
        .mockRejectedValueOnce(new Error('Failed to parse detail'))
        .mockResolvedValueOnce(jobDetail)

      await expect(jobParser.parseDetail(content, url)).rejects.toThrow('Failed to parse detail')

      const result = await jobParser.parseDetail(content, url)

      expect(result).toBe(jobDetail)
      expect(firstStrategy.parseDetail).toHaveBeenCalledTimes(2)
    })
  })
})
