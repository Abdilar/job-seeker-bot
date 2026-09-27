import { describe, expect, it } from 'vitest'
import { EContractType } from '../../../types'
import { CONTRACT_TYPE_MAP } from '../../constants'
import { ContractTypeFilterKeyboard } from './contract-type-filter.keyboard'

describe('ContractTypeFilterKeyboard', () => {
  const keyboard = new ContractTypeFilterKeyboard()

  it('creates contract type filter buttons', () => {
    const result = keyboard.create(3)

    expect(result.inline_keyboard).toEqual([
      [
        {
          text: CONTRACT_TYPE_MAP.full_time,
          callback_data: `filters:contractType:${EContractType.FULL_TIME}`,
        },
      ],
      [
        {
          text: CONTRACT_TYPE_MAP.part_time,
          callback_data: `filters:contractType:${EContractType.PART_TIME}`,
        },
      ],
      [
        {
          text: '❌ حذف فیلتر',
          callback_data: 'filters:contractType:clear',
        },
        {
          text: '⬅️ بازگشت',
          callback_data: 'filters:3',
        },
      ],
    ])
  })
})
