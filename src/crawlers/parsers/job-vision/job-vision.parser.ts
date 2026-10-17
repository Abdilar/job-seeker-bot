import type { Locator } from 'playwright'
import { EContractType, EProvider } from '../../../types'
import type { ICompany, ICrawledJob, ILocation } from '../../../types'
import { TODAY } from '../../../constants'
import {
  CITY_SELECTOR,
  COMPANY_SELECTOR,
  JOB_ID_PATTERN,
  JOB_VISION_ORIGIN,
  LOCATION_COUNTRY,
  PART_TIME_SELECTOR,
  PASSED_DAYS_SELECTOR,
  SALARY_CURRENCY,
  TITLE_SELECTOR,
  YESTERDAY,
} from './job-vision.constant'
import type { IJobParserStrategy } from '../job.model'
import { toEnglishDigits } from '../../utilities'
import { convertDaysAgoToJalaliDate } from '../../../utilities'

export class JobVisionParser implements IJobParserStrategy {
  async parse(content: Locator): Promise<ICrawledJob | undefined> {
    try {
      const href = await content.getAttribute('href')
      if (!href) {
        throw new Error('Url not found...')
      }
      const url = this.parseUrl(href)
      const title = await this.getText(content.locator(TITLE_SELECTOR))
      const passedDateAttribute = await this.getText(content.locator(PASSED_DAYS_SELECTOR))
      const postedAt = convertDaysAgoToJalaliDate(this.parsePassedDays(passedDateAttribute))
      const companyAttribute = await this.getText(content.locator(COMPANY_SELECTOR))
      const company: ICompany = this.parseCompany(companyAttribute)
      const cityAttribute = await this.getText(content.locator(CITY_SELECTOR))
      const location: ILocation = this.parseLocation(cityAttribute)
      const isPartTime = (await content.locator(PART_TIME_SELECTOR).count()) > 0
      const salary = await this.getText(content.locator('span', { hasText: SALARY_CURRENCY }))

      return {
        title: title.trim(),
        url,
        provider: EProvider.JOB_VISION,
        postedAt,
        contractType: isPartTime ? EContractType.PART_TIME : EContractType.FULL_TIME,
        salary: salary.trim(),
        location,
        company,
      }
    } catch {
      // eslint-disable-next-line no-console
      console.error(`Jobvision parser has been occurred an Error!`)
      return undefined
    }
  }

  private async getText(locator: Locator): Promise<string> {
    return (await locator.count()) ? (await locator.textContent()) || '' : ''
  }

  private parseUrl(href: string): string {
    const { origin, pathname } = new URL(href, JOB_VISION_ORIGIN)
    const [, jobId] = pathname.match(JOB_ID_PATTERN) ?? []

    if (!jobId) {
      throw new Error('Job id not found...')
    }

    return `${origin}/jobs/${jobId}`
  }

  private parsePassedDays(passedDays: string): string {
    if (passedDays.trim() === YESTERDAY) {
      return '1'
    }

    return toEnglishDigits(passedDays).replaceAll(/\D/g, '').trim() || TODAY
  }

  private parseCompany(name: string): ICompany {
    return {
      fullName: name.trim(),
    }
  }

  private parseLocation(city: string): ILocation {
    return {
      country: LOCATION_COUNTRY,
      province: city.trim(),
    }
  }
}
