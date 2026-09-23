import { describe, expect, it } from 'vitest'

import { EContractType } from '../../../types'

import { convertPersianContractTypeToEContractType } from '.'

describe('convertPersianContractTypeToEContractType', () => {
  it.each(['تمام وقت', 'تمام‌وقت', ' تمام وقت', 'تمام وقت ', '  تمام وقت  ', '\tتمام‌وقت\n'])(
    'should return FULL_TIME for "%s"',
    (contractType) => {
      const result = convertPersianContractTypeToEContractType(contractType)

      expect(result).toBe(EContractType.FULL_TIME)
    },
  )

  it.each(['پاره وقت', 'پاره‌وقت', 'قراردادی', 'کارآموزی', '', '   ', 'تماموقت'])(
    'should return PART_TIME for "%s"',
    (contractType) => {
      const result = convertPersianContractTypeToEContractType(contractType)

      expect(result).toBe(EContractType.PART_TIME)
    },
  )
})
