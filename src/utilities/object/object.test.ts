import { describe, expect, it } from 'vitest'

import { isEmptyObject } from './object.util'

describe('isEmptyObject', () => {
  it('should return true for an empty object', () => {
    expect(isEmptyObject({})).toBe(true)
  })

  it('should return false for a non-empty object', () => {
    expect(isEmptyObject({ name: 'Saeed' })).toBe(false)
  })
})
