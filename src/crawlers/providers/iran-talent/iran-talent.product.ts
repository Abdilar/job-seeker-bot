import type { Locator, Page } from 'playwright'
import { JOB_POSTING_TIMEZONE, WAIT_UNTIL } from '../../constants'
import type { IJobProvider } from '../job.model'
import { EProvider, type ICrawledJob } from '../../../types'
import type { JobParser } from '../../parsers'
import {
  IRAN_TALENT_RENDER_TIMEOUT,
  IRAN_TALENT_URL,
  JOB_ELEMENT_SELECTOR,
  MAIN_ELEMENT_SELECTOR,
} from './iran-talent.constant'
import { isRecent, randomDelay } from '../../../utilities'
import { toEnglishDigits } from '../../utilities'
import type { IJobService } from '../../../services'
import { ECrawlMode } from '../../../constants'

export class IranTalentProduct implements IJobProvider {
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
    // NOTE: IranTalent server-renders each page, so `?page=` resolves without the cached-session clearing Jobvision needs.
    await this.page.goto(IRAN_TALENT_URL, { waitUntil: WAIT_UNTIL })
    await this.waitForJobs()
    this.mainElement = this.getElement(MAIN_ELEMENT_SELECTOR)

    this.lastPage = await this.getLastPage()
  }

  private getElement(selector: string): Locator {
    return this.page.locator(selector)
  }

  private async waitForJobs(): Promise<void> {
    try {
      // NOTE: Cards hydrate after the document is ready, so a successful navigation alone does not mean they exist.
      await this.page
        .locator(JOB_ELEMENT_SELECTOR)
        .first()
        .waitFor({ state: 'visible', timeout: IRAN_TALENT_RENDER_TIMEOUT })
    } catch {
      throw new Error(`IranTalent Provider: Job cards have not been rendered.`)
    }
  }

  private async getLastPage(): Promise<number> {
    const pageButtons = this.getElement('button.page-number')
    const pageButtonsTotal = await pageButtons.count()

    if (!pageButtonsTotal) {
      return 1
    }

    const labels = await pageButtons.allTextContents()
    const pageNumbers = labels
      .map((label) => Number(toEnglishDigits(label).replaceAll(/\D/g, '')))
      .filter((pageNumber) => pageNumber > 0)

    if (!pageNumbers.length) {
      // eslint-disable-next-line no-console
      console.error(`IranTalent Provider: Couldn't read the pagination: `, { labels })

      return 1
    }

    // NOTE: The paginator always renders the last page number, while the total job count divided by a page size would misread it because IranTalent pads some pages with boosted cards.
    return Math.max(...pageNumbers)
  }

  private async goNextPage() {
    if (this.currentPage < this.lastPage) {
      this.currentPage++
      await this.page.goto(`${IRAN_TALENT_URL}&page=${this.currentPage}`, {
        waitUntil: WAIT_UNTIL,
      })
      await this.waitForJobs()
      this.mainElement = this.getElement(MAIN_ELEMENT_SELECTOR)
    }
  }

  private async getFullJobs(): Promise<ICrawledJob[]> {
    const jobs: ICrawledJob[] = []

    for (let page = 1; page <= this.lastPage; page++) {
      try {
        // eslint-disable-next-line no-console
        console.info(`IranTalent Provider: Fetching page "${page}"`)
        const items = await this.fetchJobs()
        jobs.push(...items)

        if (page === this.lastPage) {
          break
        }

        // eslint-disable-next-line no-console
        console.info(`IranTalent Provider: Fetch has been done.`, {
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
    const latestJob = await this.service.getLatestJobByProvider(EProvider.IRAN_TALENT)

    let shouldContinue = true
    for (let page = 1; shouldContinue && page <= this.lastPage; page++) {
      try {
        // eslint-disable-next-line no-console
        console.info(`IranTalent Provider: Fetching page "${page}"`)
        const items = await this.fetchJobs()
        const recentJobs = items.filter(
          (item) =>
            !item.postedAt || isRecent(item.postedAt, latestJob?.postedAt, JOB_POSTING_TIMEZONE),
        )
        jobs.push(...recentJobs)
        const lastJob = items.at(-1)
        shouldContinue = lastJob
          ? !lastJob.postedAt ||
            isRecent(lastJob.postedAt, latestJob?.postedAt, JOB_POSTING_TIMEZONE)
          : false
        // eslint-disable-next-line no-console
        console.info(`IranTalent Provider: Fetch has been done.`, {
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
