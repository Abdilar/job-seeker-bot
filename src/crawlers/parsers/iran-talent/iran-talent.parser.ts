import type { Locator } from 'playwright'
import { EContractType, EProvider } from '../../../types'
import type { ICompany, ICrawledJob, ILocation } from '../../../types'
import { TODAY } from '../../../constants'
import {
  COMPANY_SELECTOR,
  IRAN_TALENT_ORIGIN,
  JOB_ID_PATTERN,
  LOCATION_COUNTRY,
  LOCATION_SELECTOR,
  PASSED_DAYS_BUCKETS,
  PASSED_DAYS_SELECTOR,
  SALARY_SELECTOR,
  TITLE_SELECTOR,
} from './iran-talent.constant'
import type { IJobParserStrategy } from '../job.model'
import { toEnglishDigits } from '../../utilities'
import { convertDaysAgoToJalaliDate } from '../../../utilities'

export class IranTalentParser implements IJobParserStrategy {
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
      const locationAttribute = await this.getText(content.locator(LOCATION_SELECTOR))
      const location: ILocation = this.parseLocation(locationAttribute)
      const salary = await this.getText(content.locator(SALARY_SELECTOR))

      return {
        title: title.trim(),
        url,
        provider: EProvider.IRAN_TALENT,
        postedAt,
        // INFO: The card only shows the workplace ( حضوری ), never the employment type, so the list cannot tell a part-time job.
        contractType: EContractType.FULL_TIME,
        salary: salary.trim(),
        location,
        company,
      }
    } catch {
      // eslint-disable-next-line no-console
      console.error(`IranTalent parser has been occurred an Error!`)
      return undefined
    }
  }

  private async getText(locator: Locator): Promise<string> {
    // NOTE: Card selectors can resolve to several nodes once the site adds a badge, and a multi-match read fails strict mode.
    const firstMatch = locator.first()

    return (await firstMatch.count()) ? (await firstMatch.textContent()) || '' : ''
  }

  private parseUrl(href: string): string {
    const { origin, pathname } = new URL(href, IRAN_TALENT_ORIGIN)
    const [, jobId] = pathname.match(JOB_ID_PATTERN) ?? []

    if (!jobId) {
      throw new Error('Job id not found...')
    }

    return `${origin}${pathname}`
  }

  private parsePassedDays(passedDays: string): string {
    const label = passedDays.trim()
    const days = toEnglishDigits(label).replaceAll(/\D/g, '').trim()

    return PASSED_DAYS_BUCKETS[label] || days || TODAY
  }

  private parseCompany(name: string): ICompany {
    return {
      fullName: name.trim(),
    }
  }

  // INFO: `Location` has no city column, so the card's city text lands in `province`; Jobinja fills the same field with a province.
  private parseLocation(city: string): ILocation {
    return {
      country: LOCATION_COUNTRY,
      province: city.trim(),
    }
  }
}
