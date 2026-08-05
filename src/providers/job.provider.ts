import { Browser, chromium } from "playwright";
import { IJobProvider, InitializeReturnType } from "./job.model";

abstract class JobProvider implements IJobProvider {
  protected browser?: Browser;

  protected async initialize(): Promise<InitializeReturnType> {
    this.browser = await chromium.launch({ headless: false });
    const page = await this.browser.newPage();

    return Promise.resolve({ page });
  }

  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
    }
  }
}
