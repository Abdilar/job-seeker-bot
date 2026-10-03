import { describe, it, expect } from 'vitest'
import { toEnglishDigits, persianNumbersToDigits } from '.'

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

  it('should preserve Arabic-Indic digits', () => {
    expect(toEnglishDigits('١٢٣٤٥٦٧٨٩٠')).toBe('١٢٣٤٥٦٧٨٩٠')
  })
})

describe('persianNumbersToDigits', () => {
  it('should convert single Persian number words', () => {
    expect(persianNumbersToDigits('صفر')).toBe(0)
    expect(persianNumbersToDigits('یک')).toBe(1)
    expect(persianNumbersToDigits('دو')).toBe(2)
    expect(persianNumbersToDigits('نوزده')).toBe(19)
    expect(persianNumbersToDigits('بیست')).toBe(20)
    expect(persianNumbersToDigits('نود')).toBe(90)
  })

  it('should convert compound Persian numbers with normal spaces', () => {
    expect(persianNumbersToDigits('بیست و یک')).toBe(21)
    expect(persianNumbersToDigits('بیست و دو')).toBe(22)
    expect(persianNumbersToDigits('سی و پنج')).toBe(35)
    expect(persianNumbersToDigits('نود و نه')).toBe(99)
  })

  it('should handle multiple spaces around "و"', () => {
    expect(persianNumbersToDigits('بیست   و   دو')).toBe(22)
    expect(persianNumbersToDigits('چهل    و    سه')).toBe(43)
  })

  it('should handle half-space around "و"', () => {
    expect(persianNumbersToDigits('بیست‌و‌دو')).toBe(22)
    expect(persianNumbersToDigits('سی‌و‌پنج')).toBe(35)
    expect(persianNumbersToDigits('نود‌و‌نه')).toBe(99)
  })

  it('should trim leading and trailing spaces', () => {
    expect(persianNumbersToDigits('  بیست و دو  ')).toBe(22)
    expect(persianNumbersToDigits('  نوزده  ')).toBe(19)
  })

  it('should return undefined for an unknown number', () => {
    expect(persianNumbersToDigits('صد')).toBeUndefined()
  })

  it('should return undefined when one part of compound number is unknown', () => {
    expect(persianNumbersToDigits('بیست و صد')).toBeUndefined()
    expect(persianNumbersToDigits('صد و دو')).toBeUndefined()
  })

  it('should return undefined when there are more than two number parts', () => {
    expect(persianNumbersToDigits('بیست و سه و چهار')).toBeUndefined()
  })

  it('should return undefined for empty input', () => {
    expect(persianNumbersToDigits('')).toBeUndefined()
    expect(persianNumbersToDigits('   ')).toBeUndefined()
  })
})
