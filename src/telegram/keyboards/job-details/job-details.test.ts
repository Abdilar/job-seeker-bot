import { describe, expect, it } from 'vitest'
import { JobDetailsKeyboard } from './job-details.keyboard'

describe('JobDetailsKeyboard', () => {
  const keyboard = new JobDetailsKeyboard()

  it('creates job URL and back-to-list buttons', () => {
    const result = keyboard.create('https://jobinja.ir/job/example', 3)

    expect(result.inline_keyboard).toEqual([
      [
        {
          text: 'مشاهده آگهی 🔗',
          url: 'https://jobinja.ir/job/example',
        },
      ],
      [
        {
          text: 'بازگشت به لیست ⬅️',
          callback_data: 'jobs:3',
        },
      ],
    ])
  })
})
