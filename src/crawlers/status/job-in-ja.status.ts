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

const APPLY_PATTERN = /ارسال\s+رزومه|ثبت\s+درخواست|ارسال\s+درخواست/i

export class JobInJaStatusChecker implements IJobStatusChecker {
  supports(provider: EProvider): boolean {
    return provider === EProvider.JOB_IN_JA
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

      if (postings.length) {
        return { status: EJobStatus.ACTIVE, reason: 'jobposting-json-ld', checkedAt }
      }

      if (APPLY_PATTERN.test(text)) {
        return { status: EJobStatus.ACTIVE, reason: 'apply-button', checkedAt }
      }

      return { status: EJobStatus.UNKNOWN, reason: 'no-status-signal', checkedAt }
    } catch (error) {
      return resolveCheckError(error, checkedAt)
    }
  }
}
