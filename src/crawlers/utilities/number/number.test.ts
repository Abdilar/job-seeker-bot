import { describe, it, expect } from 'vitest'

import { toEnglishDigits } from '.'

describe('toEnglishDigits', () => {
  it('should convert all Persian digits to English digits', () => {
    expect(toEnglishDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789')
  })

  it('should convert Persian digits in a mixed string', () => {
    expect(toEnglishDigits('حقوق از ۲۰ تا ۳۰ میلیون')).toBe('حقوق از 20 تا 30 میلیون')
  })

  it('should preserve English digits', () => {
    expect(toEnglishDigits('1234567890')).toBe('1234567890')
  })

  it('should preserve non-numeric characters', () => {
    expect(toEnglishDigits('Hello سلام! @#$')).toBe('Hello سلام! @#$')
  })

  it('should return an empty string for empty input', () => {
    expect(toEnglishDigits('')).toBe('')
  })

  it('should convert repeated Persian digits', () => {
    expect(toEnglishDigits('۱۱۱۲۲۲۳۳۳')).toBe('111222333')
  })

  it('should handle mixed Persian and English digits', () => {
    expect(toEnglishDigits('۱۲3۴۵6۷۸9۰')).toBe('1234567890')
  })

  it('should convert Arabic-Indic digits to English digits', () => {
    expect(toEnglishDigits('١٢٣٤٥٦٧٨٩٠')).toBe('1234567890')
  })

  it('should convert Arabic-Indic digits in a mixed string', () => {
    expect(toEnglishDigits('٦١ آگهی استخدام')).toBe('61 آگهی استخدام')
  })

  it('should convert mixed Persian and Arabic-Indic digits', () => {
    expect(toEnglishDigits('۶۰ و ٣٠٠')).toBe('60 و 300')
  })
})
