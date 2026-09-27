import type { Locator } from 'playwright'
import { describe, expect, it, vi } from 'vitest'
import type { IJobParserStrategy } from './job.model'
import { JobParser } from './job.parser'

describe('JobParser', () => {
  const content = {} as Locator

  it('delegates parsing to the current strategy', async () => {
    const parseMock = vi.fn<IJobParserStrategy['parse']>()
    const strategy: IJobParserStrategy = {
      parse: parseMock,
    }

    parseMock.mockResolvedValue(undefined)

    const parser = new JobParser(strategy)

    await parser.parse(content)

    expect(parseMock).toHaveBeenCalledOnce()
    expect(parseMock).toHaveBeenCalledWith(content)
  })

  it('returns the result of the current strategy', async () => {
    const parseMock = vi.fn<IJobParserStrategy['parse']>()
    const strategy: IJobParserStrategy = {
      parse: parseMock,
    }

    parseMock.mockResolvedValue(undefined)

    const parser = new JobParser(strategy)

    const result = await parser.parse(content)

    expect(result).toBeUndefined()
  })

  it('changes strategy at runtime', async () => {
    const firstParseMock = vi.fn<IJobParserStrategy['parse']>()
    const secondParseMock = vi.fn<IJobParserStrategy['parse']>()

    const firstStrategy: IJobParserStrategy = {
      parse: firstParseMock,
    }

    const secondStrategy: IJobParserStrategy = {
      parse: secondParseMock,
    }

    const parser = new JobParser(firstStrategy)

    parser.setParser(secondStrategy)

    await parser.parse(content)

    expect(firstParseMock).not.toHaveBeenCalled()
    expect(secondParseMock).toHaveBeenCalledOnce()
    expect(secondParseMock).toHaveBeenCalledWith(content)
  })

  it('throws when setting an invalid strategy', () => {
    const parseMock = vi.fn<IJobParserStrategy['parse']>()

    const parser = new JobParser({
      parse: parseMock,
    })

    expect(() => {
      parser.setParser(null as unknown as IJobParserStrategy)
    }).toThrow('The parser is invalid!')
  })
})
