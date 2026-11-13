import type { Locator } from 'playwright'
import { describe, expect, it, vi } from 'vitest'
import { getLocatorText } from '.'

function createLocator(value: string | null, matches = 1) {
  const firstMatch = {
    count: vi.fn().mockResolvedValue(matches),
    textContent: vi.fn().mockResolvedValue(value),
  }
  const collection = {
    first: vi.fn().mockReturnValue(firstMatch),
    textContent: vi.fn(),
  }

  return { collection, firstMatch }
}

describe('getLocatorText', () => {
  it('should return the text of the locator', async () => {
    const { collection } = createLocator('سرپرست کنترل کیفیت')

    expect(await getLocatorText(collection as unknown as Locator)).toBe('سرپرست کنترل کیفیت')
  })

  it('should read the first match instead of the whole collection', async () => {
    const { collection, firstMatch } = createLocator('تهران')

    collection.textContent.mockRejectedValue(
      new Error('strict mode violation: locator resolved to 2 elements'),
    )

    expect(await getLocatorText(collection as unknown as Locator)).toBe('تهران')
    expect(collection.first).toHaveBeenCalledOnce()
    expect(collection.textContent).not.toHaveBeenCalled()
    expect(firstMatch.textContent).toHaveBeenCalledOnce()
  })

  it('should return an empty string without reading text when nothing matches', async () => {
    const { collection, firstMatch } = createLocator(null, 0)

    expect(await getLocatorText(collection as unknown as Locator)).toBe('')
    expect(firstMatch.textContent).not.toHaveBeenCalled()
  })

  it('should return an empty string when the matched node has no text', async () => {
    const { collection } = createLocator(null)

    expect(await getLocatorText(collection as unknown as Locator)).toBe('')
  })

  it('should keep the text as it is, because trimming belongs to the parser', async () => {
    const { collection } = createLocator('  ۳۵ تا ۴۵ میلیون تومان  ')

    expect(await getLocatorText(collection as unknown as Locator)).toBe('  ۳۵ تا ۴۵ میلیون تومان  ')
  })
})
