import {chromium, Locator, Page} from 'playwright'
import { ICompany } from '../types/company.model'
import { ILocation } from '../types/location.model'
import { IJob } from '../types/job.model'
import { nanoid } from 'nanoid'
import { format, subDays } from 'date-fns-jalali'
import { toEnglishDigits } from '../utilities/number.util'

const SOFTWARE_URL = 'https://jobinja.ir/jobs/category/it-software-web-development-jobs/%D8%A7%D8%B3%D8%AA%D8%AE%D8%AF%D8%A7%D9%85-%D9%88%D8%A8-%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D9%87-%D9%86%D9%88%DB%8C%D8%B3-%D9%86%D8%B1%D9%85-%D8%A7%D9%81%D8%B2%D8%A7%D8%B1?sort_by=relevance_desc'
const TODAY = 'today'

export async function start() {
  const browser = await chromium.launch({headless: false})

  const page = await browser.newPage()

  await page.goto(SOFTWARE_URL, {waitUntil: 'networkidle'})
  const mainElement = page.locator('.c-jobSearchView')
  // await page.pause()
  const jobs = getList('.c-jobListView__item', mainElement)
  const jobObject: Array<IJob> = await getJobs(jobs)
  // const titleJob = await firstJob.locator('.c-jobListView__titleLink').textContent()
  // const linkJob = await firstJob.locator('.c-jobListView__titleLink').getAttribute('href')

  console.log({jobObject})
  return jobObject
}

function getList(selector: string, element: Locator) {
  const elements = element.locator(selector)
  return elements
}


async function getJobs(jobs: Locator) {
  const count = await jobs.count()
  const parsedJob: Array<IJob> = []

  for (let index = 0; index < count; index++) {
    const job = await jobParser(jobs.nth(index))
    parsedJob.push(job)
  }
  return parsedJob
}

async function jobParser(job: Locator) {
  const today = new Date()
  const title = await job.locator('.c-jobListView__titleLink').textContent() || ''
  const url = await job.locator('.c-jobListView__titleLink').getAttribute('href')
  const passedDateAttribute = await job.locator('.c-jobListView__passedDays').textContent() || ''
  const passedDate = toEnglishDigits(passedDateAttribute).replaceAll(/\D/g, '').trim() || TODAY
  const postedAt = getPostedAt(passedDate)
  const attributes = getList('.c-jobListView__metaItem', job)
  const companyAttribute: string = await attributes.nth(0).locator('span').textContent() || ''
  const company: ICompany = new Company(companyAttribute)
  const locationAttribute: string = await attributes.nth(1).locator('span').textContent() || ''
  const location: ILocation = new Location(locationAttribute)
  const contractTypeAttribute: string = await attributes.nth(2).locator('span > span:first-of-type').textContent() || ''
  const contractType: string = contractTypeAttribute.replaceAll('قرارداد', '').trim()
  // const salaryAttribute: string = await attributes.nth(2).locator('span > span:first-of-type').textContent() || ''
  // const salary: string = salaryAttribute.replaceAll(/\(|\)|حقوق از/g, "")
  const result: IJob = {
    id: nanoid(),
    url: url || undefined,
    provider: 'job_in_ja',
    salary:  undefined,
    location,
    company,
    contractType,
    title: title.trim(),
    postedAt
  }
  return result
}

function getPostedAt(date: string) {
  if (!date) return
  const today = new Date()
  if (date === TODAY) {
    return format(today, 'yyyy/MM/dd')
  }

  const subDaysDate = subDays(today, Number(date));
  return format(subDaysDate, 'yyyy/MM/dd')
}

class Company implements ICompany {
  public readonly full_name: string;
  public readonly persian_name?: string;
  public readonly english_name?: string;

  constructor(name: string) {
    this.full_name = name.trim()

    const [persianName, englishName] = this.full_name.split('|', 2).map(item => item.trim())
    this.persian_name = persianName || undefined
    this.english_name = englishName || undefined
  }
}

class Location implements ILocation {
  public readonly country: string = 'ایران';
  public readonly province?: string;
  public readonly city?: string;
  private _full_name: string;

  constructor(name: string) {
    this._full_name = name.trim()

    const [province, city] = this._full_name.split('،', 2).map(item => item.trim())
    this.province = province || undefined
    this.city = city || undefined
  }
}


