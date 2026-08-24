import { Browser, chromium, Page } from "playwright";
import { IJobProvider } from "./job.model";

export abstract class JobProvider {
  protected abstract createProvider(page: Page): IJobProvider
  protected browser?: Browser;

  protected async initialize(): Promise<Page> {
    this.browser = await chromium.launch({ headless: false });
    const page = await this.browser.newPage();

    const provider = this.createProvider(page)
    const jobs = await provider.getJobs()

    return Promise.resolve(jobs);
  }

  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
    }
  }
}
