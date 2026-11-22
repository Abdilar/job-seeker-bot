import type { IJob } from '../../../types'
import { toJalali } from '../../../utilities'
import {
  CONTRACT_TYPE_MAP,
  EDUCATION_MAP,
  GENDER_MAP,
  PAGINATION_LIMIT,
  PROVIDER_MAP,
  VISA_SPONSORSHIP_MAP,
  WORK_MODE_MAP,
} from '../../constants'
import type { IJobFormatter } from './job.model'

export class JobFormatter implements IJobFormatter {
  formatList(jobs: Array<IJob>, page: number, totalPages: number): string {
    const jobMessage = jobs
      .map((job, index) => {
        const jobIndex = index + 1 + (page - 1) * PAGINATION_LIMIT

        return `
<b>${jobIndex}. ${job.title}</b>
${job.company.fullName}
${CONTRACT_TYPE_MAP[job.contractType]}
      `
      })
      .join('\n')

    return jobMessage.concat(`\n\n\nصفحه ${page} از ${totalPages}`)
  }

  formatDetail(job: IJob): string {
    return (
      `
<b>${job.title}</b>
${job.company.fullName} ${job.detail?.category ? '| ' + job.detail.category : ''} ${job.detail?.visaSponsorship ? '| ' + VISA_SPONSORSHIP_MAP[job.detail.visaSponsorship] : ''}

${job.detail?.description}

` +
      this.getJobDetailListAttribute('مسئولیت‌ها', job.detail?.responsibilities ?? []) +
      this.getJobDetailListAttribute('نیازمندی‌ها', job.detail?.requirements ?? []) +
      this.getJobDetailListAttribute('شرایط احراز', job.detail?.preferredQualifications ?? []) +
      this.getJobDetailListAttribute('مهارت‌ها', job.detail?.skills ?? []) +
      this.getJobDetailListAttribute('مزایا', job.detail?.benefits ?? []) +
      this.getJobDetailAttribute(
        '💼 شیوه کار',
        job.detail?.workMode ? WORK_MODE_MAP[job.detail.workMode] : undefined,
      ) +
      this.getJobDetailAttribute(
        '📚 تحصیلات',
        job.detail?.education ? EDUCATION_MAP[job.detail.education] : 'مهم نیست',
      ) +
      this.getJobDetailAttribute(
        '👨🏻‍💼 جنسیت',
        job.detail?.gender ? GENDER_MAP[job.detail.gender] : 'مهم نیست',
      ) +
      this.getJobDetailAttribute(
        '📈 سابقه',
        job.detail?.experience?.raw ? job.detail.experience.raw : undefined,
      ) +
      this.getJobDetailAttribute('💰 حقوق', job.detail?.salary ? job.detail.salary : undefined) +
      this.getJobDetailAttribute('📍 موقعیت', `${job.location.country}, ${job.location.province}`) +
      this.getJobDetailAttribute(
        '📄 نوع قرارداد',
        job.contractType ? CONTRACT_TYPE_MAP[job.contractType] : undefined,
      ) +
      this.getJobDetailAttribute('\n\n📅 تاریخ انتشار', toJalali(job.postedAt ?? new Date())) +
      this.getJobDetailAttribute('🌐 منبع', PROVIDER_MAP[job.provider])
    )
  }

  private getJobDetailListAttribute(key: string, value: Array<string>): string {
    if (!value.length) {
      return ''
    }

    return key + '\n' + value.map((item) => '- ' + item).join('\n') + '\n\n'
  }

  private getJobDetailAttribute(key: string, value?: string): string {
    if (!value) {
      return ''
    }

    return `${key}: <b>${value}</b>\n\n`
  }
}
