import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EJobStatus, EProvider } from '../../types'
import { JobInJaStatusChecker } from './job-in-ja.status'
import { JobVisionStatusChecker } from './job-vision.status'
import { htmlToText, normalizeJobUrl, parseJobPostingJsonLd } from './job-status.util'

const jobInJaUrl = 'https://jobinja.ir/companies/example/jobs/abc/example-job'
const jobVisionUrl = 'https://jobvision.ir/jobs/123'

const response = (body: string, status = 200, finalUrl = jobInJaUrl) => ({
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

describe('job status util', () => {
  it('normalizes query strings and hashes away', () => {
    expect(normalizeJobUrl('https://jobinja.ir/jobs/1?utm=1#apply')).toBe(
      'https://jobinja.ir/jobs/1',
    )
  })

  it('converts HTML into readable text', () => {
    expect(htmlToText('<div>سلام&nbsp;<b>دنیا</b></div>')).toBe('سلام دنیا')
  })

  it('reads JobPosting blocks and ignores malformed ones', () => {
    const html = `${jobPosting({ validThrough: '2027-01-01' })}<script type="application/ld+json">{</script>`

    expect(parseJobPostingJsonLd(html)).toEqual([
      expect.objectContaining({ '@type': 'JobPosting', validThrough: '2027-01-01' }),
    ])
  })
})

describe('JobInJaStatusChecker', () => {
  const checker = new JobInJaStatusChecker()
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('supports only Jobinja', () => {
    expect(checker.supports(EProvider.JOB_IN_JA)).toBe(true)
    expect(checker.supports(EProvider.JOB_VISION)).toBe(false)
  })

  it('marks a page with a JobPosting as active', async () => {
    fetchMock.mockResolvedValue(response(`<html><body>${jobPosting()}</body></html>`))

    const result = await checker.check({ url: jobInJaUrl, provider: EProvider.JOB_IN_JA })

    expect(result.status).toBe(EJobStatus.ACTIVE)
    expect(result.reason).toBe('jobposting-json-ld')
  })

  it('marks explicit expired text as expired', async () => {
    fetchMock.mockResolvedValue(response('<html><body>این آگهی منقضی شده است</body></html>'))

    const result = await checker.check({ url: jobInJaUrl, provider: EProvider.JOB_IN_JA })

    expect(result.status).toBe(EJobStatus.EXPIRED)
    expect(result.reason).toBe('source-expired')
  })

  it('marks a filled position as closed', async () => {
    fetchMock.mockResolvedValue(response('<html><body>تکمیل ظرفیت</body></html>'))

    const result = await checker.check({ url: jobInJaUrl, provider: EProvider.JOB_IN_JA })

    expect(result.status).toBe(EJobStatus.CLOSED)
    expect(result.reason).toBe('position-closed')
  })

  it('marks 404 as removed', async () => {
    fetchMock.mockResolvedValue(response('', 404))

    const result = await checker.check({ url: jobInJaUrl, provider: EProvider.JOB_IN_JA })

    expect(result.status).toBe(EJobStatus.REMOVED)
    expect(result.reason).toBe('http-404')
  })

  it('keeps a 403 as unknown', async () => {
    fetchMock.mockResolvedValue(response('', 403))

    const result = await checker.check({ url: jobInJaUrl, provider: EProvider.JOB_IN_JA })

    expect(result.status).toBe(EJobStatus.UNKNOWN)
    expect(result.reason).toBe('http-403')
  })

  it('marks a redirect to the home page as removed', async () => {
    fetchMock.mockResolvedValue(response('', 200, 'https://jobinja.ir/'))

    const result = await checker.check({ url: jobInJaUrl, provider: EProvider.JOB_IN_JA })

    expect(result.status).toBe(EJobStatus.REMOVED)
    expect(result.reason).toBe('redirect')
  })

  it('returns unknown when the page has no usable signal', async () => {
    fetchMock.mockResolvedValue(response('<html><body>صفحه</body></html>'))

    const result = await checker.check({ url: jobInJaUrl, provider: EProvider.JOB_IN_JA })

    expect(result.status).toBe(EJobStatus.UNKNOWN)
    expect(result.reason).toBe('no-status-signal')
  })

  it('returns unknown on network errors and timeouts', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'))
    const network = await checker.check({ url: jobInJaUrl, provider: EProvider.JOB_IN_JA })

    const timeoutError = new Error('timeout')
    timeoutError.name = 'AbortError'
    fetchMock.mockRejectedValueOnce(timeoutError)
    const timeout = await checker.check({ url: jobInJaUrl, provider: EProvider.JOB_IN_JA })

    expect(network).toMatchObject({ status: EJobStatus.UNKNOWN, reason: 'network-error' })
    expect(timeout).toMatchObject({ status: EJobStatus.UNKNOWN, reason: 'timeout' })
  })
})

describe('JobVisionStatusChecker', () => {
  const checker = new JobVisionStatusChecker()
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('supports only JobVision', () => {
    expect(checker.supports(EProvider.JOB_VISION)).toBe(true)
    expect(checker.supports(EProvider.JOB_IN_JA)).toBe(false)
  })

  it('marks a future validThrough as active', async () => {
    fetchMock.mockResolvedValue(
      response(jobPosting({ validThrough: '2999-01-01T00:00:00Z' }), 200, jobVisionUrl),
    )

    const result = await checker.check({ url: jobVisionUrl, provider: EProvider.JOB_VISION })

    expect(result.status).toBe(EJobStatus.ACTIVE)
    expect(result.reason).toBe('valid-through')
  })

  it('marks a past validThrough as expired', async () => {
    fetchMock.mockResolvedValue(
      response(jobPosting({ validThrough: '2000-01-01T00:00:00Z' }), 200, jobVisionUrl),
    )

    const result = await checker.check({ url: jobVisionUrl, provider: EProvider.JOB_VISION })

    expect(result.status).toBe(EJobStatus.EXPIRED)
    expect(result.reason).toBe('valid-through')
  })

  it('keeps a JobPosting without validThrough as active', async () => {
    fetchMock.mockResolvedValue(response(jobPosting(), 200, jobVisionUrl))

    const result = await checker.check({ url: jobVisionUrl, provider: EProvider.JOB_VISION })

    expect(result.status).toBe(EJobStatus.ACTIVE)
    expect(result.reason).toBe('jobposting-json-ld')
  })

  it('marks closed text and 404 correctly', async () => {
    fetchMock.mockResolvedValueOnce(
      response('<html><body>این آگهی بسته شده است</body></html>', 200, jobVisionUrl),
    )
    const closed = await checker.check({ url: jobVisionUrl, provider: EProvider.JOB_VISION })

    fetchMock.mockResolvedValueOnce(response('', 404, jobVisionUrl))
    const removed = await checker.check({ url: jobVisionUrl, provider: EProvider.JOB_VISION })

    expect(closed.status).toBe(EJobStatus.CLOSED)
    expect(removed.status).toBe(EJobStatus.REMOVED)
  })

  it('returns unknown when there is no JobPosting', async () => {
    fetchMock.mockResolvedValue(response('<html><body>صفحه</body></html>', 200, jobVisionUrl))

    const result = await checker.check({ url: jobVisionUrl, provider: EProvider.JOB_VISION })

    expect(result.status).toBe(EJobStatus.UNKNOWN)
    expect(result.reason).toBe('no-status-signal')
  })
})
