import type { Locator, Page } from 'playwright'
import { WAIT_UNTIL } from '../../constants'
import { toEnglishDigits } from '../../utilities'
import type { IJobProvider } from '../job.model'
import type { IExtractedJob, ICrawledJobDetail } from '../../../types'
import { EProvider, type IJob, type ICrawledJob } from '../../../types'
import type { JobParser } from '../../parsers'
import { JOB_IN_JA_URL, SUMMERY_ELEMENT_SELECTOR } from './job-in-ja.constant'
import { isRecent, randomDelay } from '../../../utilities'
import { JobExtractionService, type IJobService } from '../../../services'
import { ECrawlMode, TEHRAN_TIMEZONE } from '../../../constants'
import { DETAIL_ELEMENT_SELECTOR } from '../../parsers/job-in-ja/job-in-ja.constant'
import { JobExtractionApi } from '../../../api'

export class JobInJaProduct implements IJobProvider {
  private lastPage: number = 1
  private currentPage: number = 1
  private mainSummeryElement?: Locator

  constructor(
    private readonly page: Page,
    private readonly parser: JobParser,
    private readonly service: IJobService,
    private readonly mode: ECrawlMode,
  ) {}

  private async getElement(selector: string): Promise<Locator> {
    const element = this.page.locator(selector)
    return element
  }

  private async getLastPage() {
    const paginationElements = await this.getElement('#js-jobSearchPaginator ul > li')
    const paginationElementsTotal = await paginationElements.count()

    if (!paginationElementsTotal) {
      return 1
    }

    const lastPageFa = await paginationElements
      .nth(paginationElementsTotal - 2)
      .locator('a')
      .textContent()

    return Number(toEnglishDigits(lastPageFa ?? '1')) || 1
  }

  private async goNextPage() {
    if (this.currentPage < this.lastPage) {
      this.currentPage++
      await this.page.goto(`${JOB_IN_JA_URL}&page=${this.currentPage}`, {
        waitUntil: WAIT_UNTIL,
      })
      this.mainSummeryElement = await this.getElement(SUMMERY_ELEMENT_SELECTOR)
    }
  }

  private async getFullJobs(): Promise<ICrawledJob[]> {
    const jobs: ICrawledJob[] = []

    for (let page = 1; page <= this.lastPage; page++) {
      try {
        // eslint-disable-next-line no-console
        console.info(`Jobinja Provider: Fetching page "${page}"`)
        const items = await this.fetchJobs()
        jobs.push(...items)

        if (page === this.lastPage) {
          break
        }

        // eslint-disable-next-line no-console
        console.info(`Jobinja Provider: Fetch has been done.`, {
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
    const latestJob = await this.service.getLatestJobByProvider(EProvider.JOB_IN_JA)

    let shouldContinue = true
    for (let page = 1; shouldContinue && page <= this.lastPage; page++) {
      try {
        // eslint-disable-next-line no-console
        console.info(`Jobinja Provider: Fetching page "${page}"`)
        const items = await this.fetchJobs()
        const recentJobs = items.filter(
          (item) => !item.postedAt || isRecent(item.postedAt, latestJob?.postedAt, TEHRAN_TIMEZONE),
        )
        jobs.push(...recentJobs)
        const lastJob = items.at(-1)
        shouldContinue = lastJob
          ? !lastJob.postedAt || isRecent(lastJob.postedAt, latestJob?.postedAt, TEHRAN_TIMEZONE)
          : false
        // eslint-disable-next-line no-console
        console.info(`Jobinja Provider: Fetch has been done.`, {
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

  private async fetchJobs(count?: number): Promise<ICrawledJob[]> {
    if (!this.mainSummeryElement) {
      throw new Error(`mainElement is required: ${this.mainSummeryElement}`)
    }
    const jobElements = this.mainSummeryElement.locator('.c-jobListView__item')
    const jobCount = count ?? (await jobElements.count())

    if (!jobCount) {
      throw new Error('No job elements found.')
    }
    const jobs: Array<ICrawledJob> = []

    for (let index = 0; index < jobCount; index++) {
      const job = await this.parser.parseSummary(jobElements.nth(index))
      if (!job) {
        // eslint-disable-next-line no-console
        console.error(`Couldn't parse a job: `, { page: this.currentPage, index: index + 1 })
        continue
      }
      jobs.push(job)
    }

    return jobs
  }

  async initializeSummery(): Promise<void> {
    await this.page.goto(JOB_IN_JA_URL, { waitUntil: WAIT_UNTIL })
    this.mainSummeryElement = await this.getElement(SUMMERY_ELEMENT_SELECTOR)

    this.lastPage = await this.getLastPage()
  }

  async getJobs(): Promise<ICrawledJob[]> {
    return this.mode === ECrawlMode.FULL ? this.getFullJobs() : this.getIncrementalJobs()
  }

  async getJobsByCount(count: number): Promise<ICrawledJob[]> {
    return await this.fetchJobs(count)
  }

  async getJobsWithoutDetail(): Promise<IJob[]> {
    const jobExtractionApi = new JobExtractionApi()
    const jobExtractionService = new JobExtractionService(jobExtractionApi)

    const jobsWithoutDetail = await this.service.getJobsWithoutDetail(EProvider.JOB_IN_JA)
    // eslint-disable-next-line no-console
    console.log(
      `jobinja provider: getJobsWithoutDetail() -> Found ${jobsWithoutDetail.length} jobs without details.`,
    )
    const condition = 4
    // eslint-disable-next-line no-console
    console.log(`jobinja provider: getJobsWithoutDetail() -> condition: ${condition}`)
    for (let index = 0; index < condition; index++) {
      try {
        const mainElement = await this.getJobDetailElement(jobsWithoutDetail[index])
        const description = await mainElement.innerText()
        const extractJobData = await jobExtractionService.extractJobDetail(description)

        const jobDetail = await this.parser.parseDetail(mainElement, this.page.url())
        const data: ICrawledJobDetail | undefined = this.updateJobDetail(extractJobData, jobDetail)

        if (data) {
          const jobData = await this.service.saveJobDetail(jobsWithoutDetail[index].id, data)
          // eslint-disable-next-line no-console
          console.log(`jobinja provider: getJobsWithoutDetail() -> jobDetail:`, {
            detail: data,
            jobData,
          })
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`jobinja provider: getJobsWithoutDetail() -> error:`, {
          error,
        })
        continue
      }
    }
    return jobsWithoutDetail
  }

  private async getJobDetailElement(job: IJob): Promise<Locator> {
    if (!job.url) {
      throw new Error('Url not found...')
    }

    await this.page.goto(job.url, { waitUntil: WAIT_UNTIL })
    const mainElement = this.page.locator(DETAIL_ELEMENT_SELECTOR)
    await mainElement.waitFor({ state: 'attached' })

    if ((await mainElement.count()) === 0) {
      throw new Error(`The ${DETAIL_ELEMENT_SELECTOR} selector does not exist!`)
    }

    return mainElement
  }

  private updateJobDetail(
    extractJob: IExtractedJob,
    jobDetail?: ICrawledJobDetail,
  ): ICrawledJobDetail | undefined {
    if (!jobDetail) {
      return undefined
    }

    jobDetail = {
      ...jobDetail,
      description: extractJob.description || undefined,
      skills: extractJob.skills,
      responsibilities: extractJob.responsibilities,
      requirements: extractJob.requirements,
      preferredQualifications: extractJob.preferredQualifications,
      benefits: extractJob.benefits,
      workMode: extractJob.workMode || undefined,
      visaSponsorship: extractJob.visaSponsorship || undefined,
    }
    return jobDetail
  }
}
