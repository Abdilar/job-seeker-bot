import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EJobStatus, EProvider } from '../../types'
import { JobLinkChecker } from './job-link.checker'

const url = 'https://jobinja.ir/companies/example/jobs/abc/example'
const target = { url, provider: EProvider.JOB_IN_JA }

const response = (body: string, status = 200, finalUrl = url) => ({
  status,
  url: finalUrl,
  text: async () => body,
})

const jobPosting = (extra: Record<string, unknown> = {}) =>
  `<script type="application/ld+json">${JSON.stringify({
    '@type': 'JobPosting',
    title: 'Example',
    ...extra,
  })}</script>`

describe('JobLinkChecker', () => {
  const checker = new JobLinkChecker()
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('supports Jobinja and JobVision only', () => {
    expect(checker.supports(EProvider.JOB_IN_JA)).toBe(true)
    expect(checker.supports(EProvider.JOB_VISION)).toBe(true)
    expect(checker.supports(EProvider.LINKED_IN)).toBe(false)
  })

  it('returns active for a JobPosting page', async () => {
    fetchMock.mockResolvedValue(response(`<html><body>${jobPosting()}</body></html>`))

    const result = await checker.check(target)

    expect(result).toMatchObject({ status: EJobStatus.ACTIVE, reason: 'jobposting-json-ld' })
  })

  it('returns expired for explicit expiry text', async () => {
    fetchMock.mockResolvedValue(response('<html><body>این آگهی منقضی شده است</body></html>'))

    const result = await checker.check(target)

    expect(result.status).toBe(EJobStatus.EXPIRED)
  })

  it('returns closed for a filled position', async () => {
    fetchMock.mockResolvedValue(response('<html><body>تکمیل ظرفیت</body></html>'))

    const result = await checker.check(target)

    expect(result.status).toBe(EJobStatus.CLOSED)
  })

  it('returns removed for 404 and redirects', async () => {
    fetchMock.mockResolvedValueOnce(response('', 404))
    const notFound = await checker.check(target)

    fetchMock.mockResolvedValueOnce(response('', 200, 'https://jobinja.ir/'))
    const redirected = await checker.check(target)

    expect(notFound.status).toBe(EJobStatus.REMOVED)
    expect(redirected.status).toBe(EJobStatus.REMOVED)
  })

  it('returns no status for transient errors and pages without signals', async () => {
    fetchMock.mockResolvedValueOnce(response('', 403))
    const forbidden = await checker.check(target)

    fetchMock.mockResolvedValueOnce(response('<html><body>صفحه</body></html>'))
    const noSignal = await checker.check(target)

    expect(forbidden.status).toBeUndefined()
    expect(forbidden.reason).toBe('http-403')
    expect(noSignal.status).toBeUndefined()
    expect(noSignal.reason).toBe('no-status-signal')
  })

  it('uses validThrough for JobVision', async () => {
    fetchMock.mockResolvedValueOnce(response(jobPosting({ validThrough: '2000-01-01T00:00:00Z' })))
    const expired = await checker.check({ url, provider: EProvider.JOB_VISION })

    fetchMock.mockResolvedValueOnce(response(jobPosting({ validThrough: '2999-01-01T00:00:00Z' })))
    const active = await checker.check({ url, provider: EProvider.JOB_VISION })

    expect(expired.status).toBe(EJobStatus.EXPIRED)
    expect(active.status).toBe(EJobStatus.ACTIVE)
  })
})
