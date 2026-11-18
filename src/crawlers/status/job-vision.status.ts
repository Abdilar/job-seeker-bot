import { EJobStatus, EProvider, type IJobStatusCheck, type IJobStatusTarget } from '../../types'
import type { IJobStatusChecker } from './job-status.model'
import {
  fetchJobPage,
  htmlToText,
  parseJobPostingJsonLd,
  resolveCheckError,
  resolvePageStatus,
  resolveTextStatus,
} from './job-status.util'

export class JobVisionStatusChecker implements IJobStatusChecker {
  supports(provider: EProvider): boolean {
    return provider === EProvider.JOB_VISION
  }

  async check(target: IJobStatusTarget): Promise<IJobStatusCheck> {
    const checkedAt = new Date()

    try {
      const page = await fetchJobPage(target.url)
      const pageStatus = resolvePageStatus(page, target.url, checkedAt)

      if (pageStatus) {
        return pageStatus
      }

      const text = htmlToText(page.body)
      const textStatus = resolveTextStatus(text, checkedAt)

      if (textStatus) {
        return textStatus
      }

      const postings = parseJobPostingJsonLd(page.body)
      const posting = postings[0]

      if (!posting) {
        return { status: EJobStatus.UNKNOWN, reason: 'no-status-signal', checkedAt }
      }

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
    } catch (error) {
      return resolveCheckError(error, checkedAt)
    }
  }
}
