import type { Locator, Page } from 'playwright'
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
import { convertPersianContractTypeToEContractType, toEnglishDigits } from '../../utilities'
import { convertDaysAgoToJalaliDate } from '../../../utilities'

interface IIranTalentPosition {
  id?: number
  employment_type?: { title_farsi?: string }
}

interface IIranTalentSearchState {
  serverSideSearchResult?: {
    data?: { data?: IIranTalentPosition[] }
    boosted_positions?: IIranTalentPosition[]
  }
}

export class IranTalentParser implements IJobParserStrategy {
  // NOTE: IranTalent prerenders `script#ng-state` only for non-browser user agents, so a headed run gets the client-rendered shell and every job keeps the card-level default.
  private contractTypes: Map<string, EContractType> = new Map()
  private contractTypesUrl: string = ''

  async parse(content: Locator): Promise<ICrawledJob | undefined> {
    try {
      const href = await content.getAttribute('href')
      if (!href) {
        throw new Error('Url not found...')
      }
      const { url, id } = this.parseUrl(href)
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
        contractType: await this.getContractType(id, content.page()),
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

  private async getContractType(jobId: string, page: Page): Promise<EContractType> {
    if (this.contractTypesUrl !== page.url()) {
      this.contractTypesUrl = page.url()
      this.contractTypes = await this.readContractTypes(page)
    }

    return this.contractTypes.get(jobId) ?? EContractType.FULL_TIME
  }

  private async readContractTypes(page: Page): Promise<Map<string, EContractType>> {
    const contractTypes = new Map<string, EContractType>()
    const stateElement = page.locator('script#ng-state').first()

    if (!(await stateElement.count())) {
      // eslint-disable-next-line no-console
      console.warn(
        `IranTalent Parser: The search state is missing, so the jobs of this page are stored as full time.`,
        {
          url: page.url(),
        },
      )

      return contractTypes
    }

    const state = await stateElement.textContent()

    try {
      const { serverSideSearchResult } = JSON.parse(state ?? '') as IIranTalentSearchState
      const positions = [
        ...(serverSideSearchResult?.data?.data ?? []),
        ...(serverSideSearchResult?.boosted_positions ?? []),
      ]

      for (const position of positions) {
        const employmentType = position.employment_type?.title_farsi

        if (!position.id || !employmentType) {
          continue
        }

        contractTypes.set(
          String(position.id),
          convertPersianContractTypeToEContractType(employmentType),
        )
      }
    } catch {
      // NOTE: A malformed payload must not cost the page its jobs, but it must not pass unnoticed either.
      // eslint-disable-next-line no-console
      console.warn(
        `IranTalent Parser: The search state is unreadable, so the jobs of this page are stored as full time.`,
        {
          url: page.url(),
        },
      )

      return new Map()
    }

    return contractTypes
  }

  private parseUrl(href: string): { url: string; id: string } {
    const { origin, pathname } = new URL(href, IRAN_TALENT_ORIGIN)
    const [, jobId] = pathname.match(JOB_ID_PATTERN) ?? []

    if (!jobId) {
      throw new Error('Job id not found...')
    }

    return { url: `${origin}${pathname}`, id: jobId }
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
