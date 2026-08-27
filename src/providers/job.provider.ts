import { Browser, chromium, Page } from "playwright";
import { IJobProvider } from "./job.model";
import { ICrawledJob } from "../types";

export abstract class JobProvider {
  protected browser?: Browser;
  
  protected abstract createProvider(page: Page): Promise<IJobProvider>

  async crawlJobs(): Promise<ICrawledJob[]> {
    this.browser = await chromium.launch({ headless: false });
    const page = await this.browser.newPage();

    const provider = await this.createProvider(page)
    return provider.getJobs()
  }

  async closeBrowser(): Promise<void> {
    await this.browser?.close()
  }
}
