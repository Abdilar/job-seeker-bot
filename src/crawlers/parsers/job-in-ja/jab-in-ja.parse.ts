import type { Locator } from 'playwright'
import type {
  ICompany,
  ICrawledJob,
  ICrawledJobDetail,
  IJobExperience,
  ILocation,
} from '../../../types'
import { EEducationLevel, EGender, EProvider, EWorkMode } from '../../../types'
import { TODAY } from '../../../constants'
import { LOCATION_COUNTRY } from './job-in-ja.constant'
import type { IJobParserStrategy } from '../job.model'
import {
  convertPersianContractTypeToEContractType,
  persianNumbersToDigits,
  toEnglishDigits,
} from '../../utilities'
import { convertDaysAgoToJalaliDate, normalizeText } from '../../../utilities'
import { DETAIL_ELEMENT_SELECTOR } from '../../providers/job-in-ja/job-in-ja.constant'

export class JobInJaParser implements IJobParserStrategy {
  async parseSummary(content: Locator): Promise<ICrawledJob | undefined> {
    try {
      const url = await content.locator('.c-jobListView__titleLink').getAttribute('href')
      if (!url) {
        throw new Error('Url not found...')
      }
      const title = (await content.locator('.c-jobListView__titleLink').textContent()) || ''
      const passedDateAttribute =
        (await content.locator('.c-jobListView__passedDays').textContent()) || ''
      const passedDate = toEnglishDigits(passedDateAttribute).replaceAll(/\D/g, '').trim() || TODAY
      const postedAt = convertDaysAgoToJalaliDate(passedDate)
      const attributes = content.locator('.c-jobListView__metaItem')
      const companyAttribute: string = (await attributes.nth(0).locator('span').textContent()) || ''
      const company: ICompany = this.parseCompany(companyAttribute)
      const locationAttribute: string =
        (await attributes.nth(1).locator('span').textContent()) || ''
      const location: ILocation = this.parseLocation(locationAttribute)
      const contractTypeAttribute: string =
        (await attributes.nth(2).locator('span > span').nth(0).textContent()) || ''
      const contractType: string = contractTypeAttribute.replaceAll('قرارداد', '').trim()

      return {
        title: title.trim(),
        url,
        provider: EProvider.JOB_IN_JA,
        postedAt,
        contractType: convertPersianContractTypeToEContractType(contractType),
        location,
        company,
      }
    } catch {
      // eslint-disable-next-line no-console
      console.error(`Jobinja summery parser has been occurred an Error!`)
      return undefined
    }
  }

  async parseDetail(content: Locator): Promise<ICrawledJobDetail | undefined> {
    try {
      const mainElement = content.locator(DETAIL_ELEMENT_SELECTOR)
      if (!mainElement) {
        throw new Error(`The ${DETAIL_ELEMENT_SELECTOR} selector does not exist!`)
      }
      const infoItemElements = mainElement.locator('.c-infoBox__item')
      const infoItems = await this.parseInfoItems(infoItemElements)
      const category = infoItems.get('دسته‌بندی شغلی')?.[0]
      const salary = this.parseSalary(infoItems)
      const gender = this.parseGender(infoItems)
      const educationalLevel = this.parseEducationalLevel(infoItems)
      const skills = infoItems.get('مهارت‌های مورد نیاز') ?? []
      const workMode = this.parseWorkMode(infoItems)
      const experience = this.parseExperience(infoItems)
      // const applicationUrl = content.getAttribute('href')

      return {
        category: category,
        salary: salary,
        gender: gender,
        skills: skills,
        experience: experience,
        education: educationalLevel,
        workMode: workMode,
      }
    } catch {
      // eslint-disable-next-line no-console
      console.error(`Jobinja detail parser has been occurred an Error!`)
      return undefined
    }
  }

  private async parseInfoItems(elements: Locator): Promise<Map<string, string[]>> {
    const result: Map<string, string[]> = new Map<string, string[]>()
    const count = await elements.count()
    for (let index = 0; index < count; index++) {
      const info = elements.nth(index)
      const title = await info.locator('.c-infoBox__itemTitle').textContent()

      if (!title) {
        continue
      }

      const values = await info.locator('.tags .black').allTextContents()
      result.set(
        normalizeText(title),
        values.map(normalizeText).filter((item) => item.length > 0),
      )
    }

    return result
  }

  private parseExperience(items: Map<string, string[]>): IJobExperience | undefined {
    const experienceData = items.get('حداقل سابقه کار')?.[0]
    if (!experienceData || experienceData === 'مهم نیست') {
      return undefined
    }

    if (experienceData.includes('کمتر از')) {
      const rawData = experienceData.replaceAll('کمتر از', '').replaceAll('سال', '').trim()
      const max = persianNumbersToDigits(rawData)
      return {
        raw: experienceData,
        maxYears: max,
      }
    } else if (experienceData.search(/[\s\u200C]+تا[\s\u200C]+/) !== -1) {
      const numbers = experienceData.replaceAll('سال', '').trim().split('تا')

      return {
        raw: experienceData,
        minYears: persianNumbersToDigits(numbers[0]),
        maxYears: persianNumbersToDigits(numbers[1].trim()),
      }
    } else {
      const rawData = experienceData.replaceAll('بیش از', '').replaceAll('سال', '').trim()
      const min = persianNumbersToDigits(rawData)
      return {
        raw: experienceData,
        minYears: min,
      }
    }
  }

  private parseEducationalLevel(items: Map<string, string[]>): EEducationLevel | undefined {
    const educationalLevel = items.get('حداقل مدرک تحصیلی')?.[0]
    return educationalLevel !== normalizeText('مهم نیست')
      ? educationalLevel === normalizeText('کارشناسی')
        ? EEducationLevel.BACHELOR
        : educationalLevel === normalizeText('دیپلم')
          ? EEducationLevel.HIGH_SCHOOL
          : educationalLevel === normalizeText('کارشناسی ارشد') ||
              educationalLevel === normalizeText('فوق‌لیسانس')
            ? EEducationLevel.MASTER
            : educationalLevel === normalizeText('کاردانی') ||
                educationalLevel === normalizeText('فوق‌دیپلم')
              ? EEducationLevel.ASSOCIATE
              : EEducationLevel.PHD
      : undefined
  }

  private parseGender(items: Map<string, string[]>): EGender | undefined {
    const gender = items.get('جنسیت')?.[0]
    return gender !== normalizeText('مهم نیست')
      ? gender === normalizeText('زن')
        ? EGender.WOMAN
        : EGender.MAN
      : undefined
  }

  private parseSalary(items: Map<string, string[]>): string | undefined {
    const salary = items.get('حقوق')?.[0] ?? ''
    const rawSalary = salary
      ?.replaceAll('از', '')
      .replaceAll('تومان', '')
      .replaceAll(',', '')
      .trim()
    return salary !== 'توافقی' ? toEnglishDigits(rawSalary) : undefined
  }

  private parseWorkMode(items: Map<string, string[]>): EWorkMode | undefined {
    const workMode = items.get('نوع همکاری') ?? []
    if (workMode.length === 1) {
      return workMode[0] === 'تمام وقت' || workMode[0] === 'پاره وقت'
        ? EWorkMode.ONSITE
        : EWorkMode.REMOTE
    }

    if (workMode.length === 2) {
      return workMode.findIndex((item) => item === 'دورکاری') !== -1 &&
        (workMode.findIndex((item) => item === 'تمام وقت') !== -1 ||
          workMode.findIndex((item) => item === 'پاره وقت') !== -1)
        ? EWorkMode.HYBRID
        : EWorkMode.ONSITE
    }

    return undefined
  }

  private parseCompany(name: string): ICompany {
    const fullName = name.trim()
    const [persianName, englishName] = fullName.split('|', 2).map((item) => item.trim())

    return {
      fullName,
      persianName,
      englishName,
    }
  }

  private parseLocation(name: string): ILocation {
    const country = LOCATION_COUNTRY
    const fullName = name.trim()
    const [province] = fullName.split('،', 2).map((item) => item.trim())

    return {
      country,
      province,
    }
  }
}
