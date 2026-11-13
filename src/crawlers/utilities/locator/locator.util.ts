import type { Locator } from 'playwright'

// NOTE: A card selector can resolve to several nodes once the site adds a badge, and reading a multi-match locator fails Playwright strict mode.
export async function getLocatorText(locator: Locator): Promise<string> {
  const firstMatch = locator.first()

  return (await firstMatch.count()) ? (await firstMatch.textContent()) || '' : ''
}
