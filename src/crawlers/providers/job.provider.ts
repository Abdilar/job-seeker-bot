import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import type { IJobProvider } from './job.model'
import type { ICrawledJob } from '../../types'

export abstract class JobProvider {
  protected browser?: Browser

  protected abstract createProvider(page: Page): Promise<IJobProvider>

  private async initPage(): Promise<Page> {
    this.browser = await chromium.launch({ headless: process.env.NODE_ENV === 'production' })
    const context = await this.browser.newContext({
      ignoreHTTPSErrors: true,
    })
    return await context.newPage()
  }

  async crawlJobs(): Promise<ICrawledJob[]> {
    const page = await this.initPage()

    const provider = await this.createProvider(page)
    return provider.getJobs()
  }

  async crawlJobsByCount(count: number) {
    const page = await this.initPage()

    const provider = await this.createProvider(page)
    return await provider.getJobsByCount(count)
  }

  async crawlJobDetail() {
    const page = await this.initPage()

    await this.createProvider(page)
  }

  async closeBrowser(): Promise<void> {
    await this.browser?.close()
  }
}
