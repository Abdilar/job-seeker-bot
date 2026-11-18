import { EJobStatusCheckOutcome, type IJobStatusCheck } from '../../types'

export const STATUS_CHECK_TIMEOUT_MS = 20_000
export const STATUS_CHECK_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export const EXPIRED_TEXT_PATTERNS = [
  /این\s+(آگهی|فرصت شغلی)[^.]{0,40}منقضی/,
  /آگهی[^.]{0,20}منقضی\s+شده/,
  /فرصت\s+شغلی[^.]{0,20}منقضی\s+شده/,
  /این\s+(آگهی|فرصت\s+شغلی)[^.]{0,30}دیگر\s+فعال\s+نیست/,
  /this\s+job[^.]{0,20}(expired|no\s+longer\s+available)/i,
]

export const CLOSED_TEXT_PATTERNS = [
  /این\s+(آگهی|فرصت\s+شغلی)[^.]{0,30}بسته\s+شده/,
  /آگهی[^.]{0,20}بسته\s+شده/,
  /تکمیل\s+ظرفیت/,
  /پذیرش[^.]{0,20}بسته\s+شده/,
  /position[^.]{0,20}(has\s+been\s+)?closed/i,
  /no\s+longer\s+accepting/i,
]

export interface IFetchedJobPage {
  status: number
  finalUrl: string
  body: string
}

export function normalizeJobUrl(url: string): string {
  const parsed = new URL(url)
  parsed.hash = ''
  parsed.search = ''

  return parsed.toString()
}

export async function fetchJobPage(url: string): Promise<IFetchedJobPage> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), STATUS_CHECK_TIMEOUT_MS)

  try {
    const response = await fetch(normalizeJobUrl(url), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': STATUS_CHECK_USER_AGENT,
        'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    return {
      status: response.status,
      finalUrl: response.url,
      body: await response.text(),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export function htmlToText(html: string): string {
  return html
    .replaceAll(/<script[\s\S]*?<\/script>/gi, ' ')
    .replaceAll(/<style[\s\S]*?<\/style>/gi, ' ')
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

export function parseJobPostingJsonLd(html: string): Array<Record<string, unknown>> {
  const postings: Array<Record<string, unknown>> = []
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1]) as unknown
      const items = Array.isArray(parsed) ? parsed : [parsed]

      for (const item of items) {
        if (
          item &&
          typeof item === 'object' &&
          (item as Record<string, unknown>)['@type'] === 'JobPosting'
        ) {
          postings.push(item as Record<string, unknown>)
        }
      }
    } catch {
      // NOTE: A malformed JSON-LD block is not a status signal by itself.
    }
  }

  return postings
}

export function hasAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

export function isRedirectedToAnotherPage(originalUrl: string, finalUrl: string): boolean {
  const original = new URL(originalUrl)
  const final = new URL(finalUrl)

  if (original.hostname !== final.hostname) {
    return true
  }

  return final.pathname === '/' || final.pathname === '/jobs' || final.pathname === '/jobs/'
}

export function resolvePageStatus(
  page: IFetchedJobPage,
  originalUrl: string,
  checkedAt: Date,
): IJobStatusCheck | undefined {
  if (page.status === 404 || page.status === 410) {
    return { outcome: EJobStatusCheckOutcome.REMOVED, reason: `http-${page.status}`, checkedAt }
  }

  if (page.status === 403 || page.status === 429 || page.status >= 500) {
    return { outcome: EJobStatusCheckOutcome.RETRY, reason: `http-${page.status}`, checkedAt }
  }

  if (page.status !== 200) {
    return { outcome: EJobStatusCheckOutcome.RETRY, reason: `http-${page.status}`, checkedAt }
  }

  if (isRedirectedToAnotherPage(originalUrl, page.finalUrl)) {
    return { outcome: EJobStatusCheckOutcome.REMOVED, reason: 'redirect', checkedAt }
  }

  if (!new URL(page.finalUrl).pathname.includes('/jobs/')) {
    return { outcome: EJobStatusCheckOutcome.REMOVED, reason: 'redirect', checkedAt }
  }

  return undefined
}

export function resolveTextStatus(text: string, checkedAt: Date): IJobStatusCheck | undefined {
  if (hasAnyPattern(text, EXPIRED_TEXT_PATTERNS)) {
    return { outcome: EJobStatusCheckOutcome.EXPIRED, reason: 'source-expired', checkedAt }
  }

  if (hasAnyPattern(text, CLOSED_TEXT_PATTERNS)) {
    return { outcome: EJobStatusCheckOutcome.CLOSED, reason: 'position-closed', checkedAt }
  }

  return undefined
}

export function resolveCheckError(error: unknown, checkedAt: Date): IJobStatusCheck {
  return {
    outcome: EJobStatusCheckOutcome.RETRY,
    reason: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network-error',
    checkedAt,
  }
}
