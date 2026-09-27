import { describe, expect, it } from 'vitest'
import { PaginationKeyboard } from './pagination.keyboard'

describe('PaginationKeyboard', () => {
  const keyboard = new PaginationKeyboard()

  it('shows only the next button on the first page', () => {
    const result = keyboard.create(1, 3)

    expect(result.inline_keyboard).toEqual([
      [
        {
          text: '➡️ بعدی',
          callback_data: 'jobs:2',
        },
      ],
    ])
  })

  it('shows previous and next buttons on a middle page', () => {
    const result = keyboard.create(2, 3)

    expect(result.inline_keyboard).toEqual([
      [
        {
          text: 'قبلی ⬅️',
          callback_data: 'jobs:1',
        },
        {
          text: '➡️ بعدی',
          callback_data: 'jobs:3',
        },
      ],
    ])
  })

  it('shows only the previous button on the last page', () => {
    const result = keyboard.create(3, 3)

    expect(result.inline_keyboard).toEqual([
      [
        {
          text: 'قبلی ⬅️',
          callback_data: 'jobs:2',
        },
      ],
    ])
  })
})
