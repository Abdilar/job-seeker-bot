import { describe, expect, it } from 'vitest'
import { JobFilterKeyboard } from './job-filter.keyboard'

describe('JobFilterKeyboard', () => {
  const keyboard = new JobFilterKeyboard()

  describe('create', () => {
    it('creates the filter button with the current page', () => {
      const result = keyboard.create(3)

      expect(result.inline_keyboard).toEqual([
        [
          {
            text: 'فیلترها 🔎',
            callback_data: 'filters:3',
          },
        ],
        [],
      ])
    })
  })

  describe('createFilterMenu', () => {
    it('creates the filter menu', () => {
      const result = keyboard.createFilterMenu(2)

      expect(result.inline_keyboard).toEqual([
        [
          {
            text: 'نوع قرارداد 📄',
            callback_data: 'filters:contractType:2',
          },
        ],
        [
          {
            text: 'منبع 🏢',
            callback_data: 'filters:provider:2',
          },
        ],
        [
          {
            text: 'حذف فیلترها ❌',
            callback_data: 'filters:clear',
          },
          {
            text: 'بازگشت به لیست ⬅️',
            callback_data: 'jobs:2',
          },
        ],
        [],
      ])
    })
  })
})
