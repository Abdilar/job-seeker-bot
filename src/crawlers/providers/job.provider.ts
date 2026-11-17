import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import type { IJobProvider } from './job.model'
import type { ICrawledJob } from '../../types'

export abstract class JobProvider {
  protected browser?: Browser

  protected abstract createProvider(page: Page): Promise<IJobProvider>

  private async initProvider(): Promise<IJobProvider> {
    this.browser = await chromium.launch({ headless: process.env.NODE_ENV === 'production' })
    const context = await this.browser.newContext({
      ignoreHTTPSErrors: true,
    })
    const page = await context.newPage()
    // eslint-disable-next-line no-console
    console.log('JobProvider: initProvider()')
    return await this.createProvider(page)
  }

  async crawlJobs(): Promise<ICrawledJob[]> {
    const provider = await this.initProvider()

    return provider.getJobs()
  }

  async crawlJobsByCount(count: number) {
    const provider = await this.initProvider()

    return await provider.getJobsByCount(count)
  }

  async crawlJobDetail() {
    const provider = await this.initProvider()

    const jobs = await provider.getJobsWithoutDetail()
    // eslint-disable-next-line no-console
    console.log('JobProvider: crawlJobDetail() -> ', { jobs: jobs.length })
    return jobs
  }

  async closeBrowser(): Promise<void> {
    // await this.browser?.close()
  }
}
