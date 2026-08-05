import { Browser, chromium, Locator, Page } from "playwright";
import {
  IJobInJaJob,
  IJobInJaProvider,
} from "./job-in-ja.model";
import { WAIT_UNTIL } from "../../constants";
import {
  JOB_IN_JA_URL,
  MAIN_ELEMENT_SELECTOR,
} from "./job-in-ja.constant";
import {
  toEnglishDigits,
} from "../../utilities";

export class JobInJaProvider implements IJobInJaProvider {
  jobs: Array<IJobInJaJob> = [];
  private lastPage: number;
  private currentPage: number = 1;

  private constructor(
    private browser: Browser,
    private page: Page,
    private mainElement: Locator,
  ) {
  }

  static async create(): Promise<IJobInJaProvider> {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();


    await page.goto(JOB_IN_JA_URL, { waitUntil: WAIT_UNTIL });

    const mainElement = page.locator(MAIN_ELEMENT_SELECTOR);
    await mainElement.waitFor({ state: "visible" });

    const lastPage = await JobInJaProvider.getLastPage(page)

    const provider = new JobInJaProvider(browser, page, mainElement)
    provider.lastPage = lastPage

    return provider
  }

  private static async getLastPage(page: Page) {
    const paginationElements = page.locator(".js-jobSearchPaginator ul > li");
    const paginationElementsTotal = await paginationElements.count();

    if (!paginationElementsTotal) {
      return 1
    }

    const lastPageFa = await paginationElements
      .nth(paginationElementsTotal - 1)
      .locator("a")
      .textContent();

    return Number(toEnglishDigits(lastPageFa ?? "1")) || 1;
  }

  async goNextPage() {
    this.currentPage += 1;
    if (this.currentPage <= this.lastPage) {
      await this.page.goto(`${JOB_IN_JA_URL}&page=${this.currentPage}`, {
        waitUntil: WAIT_UNTIL,
      });
      this.mainElement = this.page.locator(MAIN_ELEMENT_SELECTOR);
      await this.mainElement.waitFor({ state: "visible" });
    }
  }

  async getJobs(): Promise<IJobInJaJob[]> {
    if (!this.mainElement) {
      throw new Error(`mainElement is required: ${this.mainElement}`);
    }

    const jobElements = this.mainElement.locator(".c-jobListView__item");
    const jobCount = await jobElements.count();

    if (!jobCount) {
      throw new Error("No job elements found.");
    }
    const localJobs: Array<IJobInJaJob> = [];
    for (let index = 0; index < jobCount; index++) {
      const job = await this.parserJob(jobElements.nth(index));
      if (!job) {
        console.error(`Couldn't parse a job: ${jobElements.nth(index)}`);
        continue;
      }
      localJobs.push(job);
    }

    this.jobs.push(...localJobs);
    return localJobs;
  }

  async close() {
    await this.browser?.close();
    this.jobs = [];
  }
}
