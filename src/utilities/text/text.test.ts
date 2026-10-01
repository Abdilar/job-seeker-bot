import { describe, expect, it } from 'vitest'
import { normalizeText } from '.'

describe('normalizeText', () => {
  it('returns an empty string for undefined', () => {
    expect(normalizeText(undefined)).toBe('')
  })

  it('returns an empty string for null', () => {
    expect(normalizeText(null)).toBe('')
  })

  it('returns an empty string for an empty string', () => {
    expect(normalizeText('')).toBe('')
  })

  it('converts Arabic Yeh to Persian Yeh', () => {
    expect(normalizeText('عربي')).toBe('عربی')
  })

  it('converts Arabic Alef Maksura to Persian Yeh', () => {
    expect(normalizeText('على')).toBe('علی')
  })

  it('converts Arabic Kaf to Persian Kaf', () => {
    expect(normalizeText('كارشناسي')).toBe('کارشناسی')
  })

  it('replaces zero-width non-joiner with a space', () => {
    expect(normalizeText('مهارت\u200cهای مورد نیاز')).toBe('مهارت های مورد نیاز')
  })

  it('replaces multiple whitespace characters with a single space', () => {
    expect(normalizeText('مهارت   های \n مورد\tنیاز')).toBe('مهارت های مورد نیاز')
  })

  it('removes leading and trailing whitespace', () => {
    expect(normalizeText('   حداقل سابقه کار   ')).toBe('حداقل سابقه کار')
  })

  it('normalizes multiple cases together', () => {
    expect(normalizeText('  مهارت\u200cهاي   مورد \n نياز  ')).toBe('مهارت های مورد نیاز')
  })

  it('does not change already normalized text', () => {
    expect(normalizeText('حداقل سابقه کار')).toBe('حداقل سابقه کار')
  })
})
