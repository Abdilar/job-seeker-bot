import type { Locator, Page } from 'playwright'
import { WAIT_UNTIL } from '../../constants'
import type { IJobProvider } from '../job.model'
import { EProvider, type ICrawledJob } from '../../../types'
import type { JobParser } from '../../parsers'
import {
  ARABIC_DIGIT_MAP,
  CLEAR_CACHED_JOBS_SCRIPT,
  JOB_ELEMENT_SELECTOR,
  JOB_VISION_PAGE_SIZE,
  JOB_VISION_TIMEZONE,
  JOB_VISION_URL,
  MAIN_ELEMENT_SELECTOR,
  TOTAL_JOBS_SELECTOR,
} from './job-vision.constant'
import { isRecent, randomDelay } from '../../../utilities'
import type { IJobService } from '../../../services'
import { ECrawlMode } from '../../../constants'

export class JobVisionProduct implements IJobProvider {
  private lastPage: number = 1
  private currentPage: number = 1
  private mainElement?: Locator

  constructor(
    private readonly page: Page,
    private readonly parser: JobParser,
    private readonly service: IJobService,
    private readonly mode: ECrawlMode,
  ) {}

  async initialize(): Promise<void> {
    await this.page.addInitScript(CLEAR_CACHED_JOBS_SCRIPT)
    await this.page.goto(JOB_VISION_URL, { waitUntil: WAIT_UNTIL })
    await this.waitForJobs()
    this.mainElement = await this.getElement(MAIN_ELEMENT_SELECTOR)

    this.lastPage = await this.getLastPage()
  }

  private async getElement(selector: string): Promise<Locator> {
    const element = this.page.locator(selector)
    return element
  }

  private async waitForJobs(): Promise<void> {
    await this.page.locator(JOB_ELEMENT_SELECTOR).first().waitFor()
  }

  private async getLastPage() {
    const totalJobsElement = await this.getElement(TOTAL_JOBS_SELECTOR)

    if (!(await totalJobsElement.count())) {
      return 1
    }

    const totalJobsAr = (await totalJobsElement.textContent()) ?? ''
    const totalJobs = Number(this.arabicToEnglishDigits(totalJobsAr).replaceAll(/\D/g, ''))

    return Math.ceil(totalJobs / JOB_VISION_PAGE_SIZE) || 1
  }

  private arabicToEnglishDigits(value: string): string {
    return value.replace(/[٠-٩]/g, (d) => ARABIC_DIGIT_MAP[d])
  }

  private async goNextPage() {
    if (this.currentPage < this.lastPage) {
      this.currentPage++
      await this.page.goto(`${JOB_VISION_URL}&page=${this.currentPage}`, {
        waitUntil: WAIT_UNTIL,
      })
      await this.waitForJobs()
      this.mainElement = await this.getElement(MAIN_ELEMENT_SELECTOR)
    }
  }

  private async getFullJobs(): Promise<ICrawledJob[]> {
    const jobs: ICrawledJob[] = []

    for (let page = 1; page <= this.lastPage; page++) {
      try {
        // eslint-disable-next-line no-console
        console.info(`Jobvision Provider: Fetching page "${page}"`)
        const items = await this.fetchJobs()
        jobs.push(...items)

        if (page === this.lastPage) {
          break
        }

        // eslint-disable-next-line no-console
        console.info(`Jobvision Provider: Fetch has been done.`, {
          page,
          lastPage: this.lastPage,
          fetched: items.length,
        })
        await randomDelay(1_000, 3_000)
        await this.goNextPage()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
        break
      }
    }

    return jobs
  }

  private async getIncrementalJobs(): Promise<ICrawledJob[]> {
    const jobs: ICrawledJob[] = []
    const latestJob = await this.service.getLatestJobByProvider(EProvider.JOB_VISION)

    let shouldContinue = true
    for (let page = 1; shouldContinue && page <= this.lastPage; page++) {
      try {
        // eslint-disable-next-line no-console
        console.info(`Jobvision Provider: Fetching page "${page}"`)
        const items = await this.fetchJobs()
        const recentJobs = items.filter(
          (item) =>
            !item.postedAt || isRecent(item.postedAt, latestJob?.postedAt, JOB_VISION_TIMEZONE),
        )
        jobs.push(...recentJobs)
        const lastJob = items.at(-1)
        shouldContinue = lastJob
          ? !lastJob.postedAt ||
            isRecent(lastJob.postedAt, latestJob?.postedAt, JOB_VISION_TIMEZONE)
          : false
        // eslint-disable-next-line no-console
        console.info(`Jobvision Provider: Fetch has been done.`, {
          page,
          lastPage: this.lastPage,
          fetched: items.length,
          recent: recentJobs.length,
          shouldContinue,
        })

        await randomDelay(1_000, 3_000)
        await this.goNextPage()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
        break
      }
    }

    return jobs
  }

  async getJobs(): Promise<ICrawledJob[]> {
    return this.mode === ECrawlMode.FULL ? this.getFullJobs() : this.getIncrementalJobs()
  }

  private async fetchJobs(): Promise<ICrawledJob[]> {
    if (!this.mainElement) {
      throw new Error(`mainElement is required: ${this.mainElement}`)
    }
    const jobElements = this.mainElement.locator(JOB_ELEMENT_SELECTOR)
    const jobCount = await jobElements.count()

    if (!jobCount) {
      throw new Error('No job elements found.')
    }
    const jobs: Array<ICrawledJob> = []

    for (let index = 0; index < jobCount; index++) {
      const job = await this.parser.parse(jobElements.nth(index))
      if (!job) {
        // eslint-disable-next-line no-console
        console.error(`Couldn't parse a job: `, { page: this.currentPage, index: index + 1 })
        continue
      }
      jobs.push(job)
    }

    return jobs
  }
}
