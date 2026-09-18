import { describe, expect, it } from 'vitest'

import { chunk } from '.'

describe('chunk', () => {
  it('should split items into chunks of the given size', () => {
    const result = chunk([1, 2, 3, 4, 5], 2)

    expect(result).toEqual([[1, 2], [3, 4], [5]])
  })

  it('should return a single chunk when size is greater than items length', () => {
    const result = chunk([1, 2, 3], 5)

    expect(result).toEqual([[1, 2, 3]])
  })

  it('should return an empty array when items is empty', () => {
    const result = chunk([], 2)

    expect(result).toEqual([])
  })

  it('should return each item in a separate chunk when size is 1', () => {
    const result = chunk([1, 2, 3], 1)

    expect(result).toEqual([[1], [2], [3]])
  })

  it('should throw when size is zero', () => {
    expect(() => chunk([1, 2, 3], 0)).toThrow('Chunk size must be greater than zero')
  })

  it('should throw when size is negative', () => {
    expect(() => chunk([1, 2, 3], -1)).toThrow('Chunk size must be greater than zero')
  })
})
