import { describe, expect, it } from 'vitest'
import { EProvider } from '../../../types'
import { PROVIDER_MAP } from '../../constants'
import { ProviderFilterKeyboard } from './provider-filter.keyboard'

describe('ProviderFilterKeyboard', () => {
  const keyboard = new ProviderFilterKeyboard()

  it('creates a button for every provider', () => {
    const result = keyboard.create(2)

    const providers = Object.values(EProvider)

    const providerRows = result.inline_keyboard.slice(0, providers.length)

    expect(providerRows).toHaveLength(providers.length)

    providers.forEach((provider, index) => {
      expect(providerRows[index]).toEqual([
        {
          text: PROVIDER_MAP[provider],
          callback_data: `filters:provider:${provider}`,
        },
      ])
    })
  })

  it('adds clear and back buttons', () => {
    const result = keyboard.create(4)

    expect(result.inline_keyboard.at(-1)).toEqual([
      {
        text: '❌ حذف فیلتر',
        callback_data: 'filters:provider:clear',
      },
      {
        text: '⬅️ بازگشت',
        callback_data: 'filters:4',
      },
    ])
  })
})
