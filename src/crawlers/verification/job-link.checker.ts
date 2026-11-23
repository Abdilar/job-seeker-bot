import { EJobStatus, EProvider, type IJob } from '../../types'
import type { IJobLinkCheck, IJobLinkChecker } from './job-link.model'

const CHECK_TIMEOUT_MS = 10_000
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const EXPIRED_PATTERNS = [
  /این\s+(آگهی|فرصت شغلی)[^.]{0,40}منقضی/,
  /آگهی[^.]{0,20}منقضی\s+شده/,
  /this\s+job[^.]{0,20}(expired|no\s+longer\s+available)/i,
]

const CLOSED_PATTERNS = [
  /این\s+(آگهی|فرصت\s+شغلی)[^.]{0,30}بسته\s+شده/,
  /آگهی[^.]{0,20}بسته\s+شده/,
  /تکمیل\s+ظرفیت/,
  /no\s+longer\s+accepting/i,
]

const REMOVED_PATTERNS = [
  /این\s+آگهی[^.]{0,30}(حذف|یافت\s+نشد)/,
  /آگهی[^.]{0,20}(حذف\s+شده|یافت\s+نشد)/,
  /فرصت\s+شغلی[^.]{0,20}(حذف\s+شده|یافت\s+نشد)/,
  /not\s+found/i,
]

interface IFetchedPage {
  status: number
  finalUrl: string
  body: string
}

const normalizeUrl = (url: string): string => {
  const parsed = new URL(url)
  parsed.hash = ''
  parsed.search = ''

  return parsed.toString()
}

const fetchPage = async (url: string): Promise<IFetchedPage> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)

  try {
    const response = await fetch(normalizeUrl(url), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
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

const htmlToText = (html: string): string =>
  html
    .replaceAll(/<script[\s\S]*?<\/script>/gi, ' ')
    .replaceAll(/<style[\s\S]*?<\/style>/gi, ' ')
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()

const parseJobPosting = (html: string): Record<string, unknown> | undefined => {
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
          return item as Record<string, unknown>
        }
      }
    } catch {
      // NOTE: A malformed JSON-LD block is not a status signal by itself.
    }
  }

  return undefined
}

const matchesAny = (text: string, patterns: RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(text))

const isRedirectedAway = (originalUrl: string, finalUrl: string): boolean => {
  const original = new URL(originalUrl)
  const final = new URL(finalUrl)

  if (original.hostname !== final.hostname) {
    return true
  }

  return final.pathname === '/' || final.pathname === '/jobs' || final.pathname === '/jobs/'
}

export class JobLinkChecker implements IJobLinkChecker {
  supports(provider: EProvider): boolean {
    return provider === EProvider.JOB_IN_JA || provider === EProvider.JOB_VISION
  }

  async check(job: Pick<IJob, 'url' | 'provider'>): Promise<IJobLinkCheck> {
    const checkedAt = new Date()

    try {
      const page = await fetchPage(job.url)

      if (page.status === 404 || page.status === 410) {
        return { status: EJobStatus.REMOVED, reason: `http-${page.status}`, checkedAt }
      }

      if (page.status === 403 || page.status === 429 || page.status >= 500 || page.status !== 200) {
        return { reason: `http-${page.status}`, checkedAt }
      }

      if (isRedirectedAway(job.url, page.finalUrl)) {
        return { status: EJobStatus.REMOVED, reason: 'redirect', checkedAt }
      }

      const text = htmlToText(page.body)

      if (matchesAny(text, EXPIRED_PATTERNS)) {
        return { status: EJobStatus.EXPIRED, reason: 'source-expired', checkedAt }
      }

      if (matchesAny(text, CLOSED_PATTERNS)) {
        return { status: EJobStatus.CLOSED, reason: 'position-closed', checkedAt }
      }

      if (matchesAny(text, REMOVED_PATTERNS)) {
        return { status: EJobStatus.REMOVED, reason: 'source-removed', checkedAt }
      }

      const posting = parseJobPosting(page.body)

      if (posting) {
        const validThrough = posting.validThrough

        if (typeof validThrough === 'string') {
          const deadline = new Date(validThrough)

          if (!Number.isNaN(deadline.getTime())) {
            return deadline.getTime() < checkedAt.getTime()
              ? { status: EJobStatus.EXPIRED, reason: 'valid-through', checkedAt }
              : { status: EJobStatus.ACTIVE, reason: 'valid-through', checkedAt }
          }
        }

        return { status: EJobStatus.ACTIVE, reason: 'jobposting-json-ld', checkedAt }
      }

      return { reason: 'no-status-signal', checkedAt }
    } catch (error) {
      return {
        reason: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network-error',
        checkedAt,
      }
    }
  }
}
