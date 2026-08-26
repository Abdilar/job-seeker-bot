import { Browser, chromium, Page } from "playwright";
import { IJobProvider } from "./job.model";

export abstract class JobProvider implements IJobProvider {
  protected abstract createProvider(page: Page): Promise<IJobProvider>
  protected browser?: Browser;

  async saveJobs(): Promise<Page> {
    this.browser = await chromium.launch({ headless: false });
    const page = await this.browser.newPage();

    const provider = this.createProvider(page)
    const jobs = await provider.getJobs()

    return Promise.resolve(jobs);
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
    }
  }
}
