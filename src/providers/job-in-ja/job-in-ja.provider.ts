import { Locator, Page } from "playwright";
import { WAIT_UNTIL } from "../../constants";
import { JOB_IN_JA_URL, MAIN_ELEMENT_SELECTOR } from "./job-in-ja.constant";
import { toEnglishDigits } from "../../utilities";
import { IJobProvider } from "../job.model";
import { JobProvider } from "..";
import { ICrawledJob } from "../../types";
import { JobInJaParser, JobParser } from "../../parser";

export class JobInJaProvider extends JobProvider {
  private lastPage: number = 1;
  private currentPage: number = 1;
  private mainElement?: Locator;

  private constructor(
    private readonly page: Page,
  ) {
    super();
  }

  protected async createProvider(page: Page): Promise<IJobProvider> {
    const provider = new JobInJaProvider(page);
    await provider.afterCreate();
    return provider;
  }

  async afterCreate(): Promise<void> {
    await this.page.goto(JOB_IN_JA_URL, { waitUntil: WAIT_UNTIL });
    this.mainElement = await this.getElement(MAIN_ELEMENT_SELECTOR);

    this.lastPage = await this.getLastPage();
  }

  private async getElement(selector: string): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: "visible" });
    return element;
  }

  private async getLastPage() {
    const paginationElements = await this.getElement(
      ".js-jobSearchPaginator ul > li",
    );
    const paginationElementsTotal = await paginationElements.count();

    if (!paginationElementsTotal) {
      return 1;
    }

    const lastPageFa = await paginationElements
      .nth(paginationElementsTotal - 1)
      .locator("a")
      .textContent();

    return Number(toEnglishDigits(lastPageFa ?? "1")) || 1;
  }

  async goNextPage() {
    if (this.currentPage < this.lastPage) {
      this.currentPage++;
      await this.page.goto(`${JOB_IN_JA_URL}&page=${this.currentPage}`, {
        waitUntil: WAIT_UNTIL,
      });
      this.mainElement = await this.getElement(MAIN_ELEMENT_SELECTOR);
    }
  }

  async getJobs(): Promise<ICrawledJob[]> {
    const jobs: ICrawledJob[] = [];

    for (let index = 0; index < this.lastPage; index++) {
      this.fetchJobs().then(async (items) => {
        jobs.push(...items);
        await this.goNextPage();
      });
    }

    return Promise.resolve(jobs)
  }

  private async fetchJobs(): Promise<ICrawledJob[]> {
    if (!this.mainElement) {
      throw new Error(`mainElement is required: ${this.mainElement}`);
    }
    const jobElements = this.mainElement.locator(".c-jobListView__item");
    const jobCount = await jobElements.count();

    if (!jobCount) {
      throw new Error("No job elements found.");
    }
    const jobs: Array<ICrawledJob> = [];

    const jobInJaParser = new JobInJaParser();
    const jobParser = new JobParser(jobInJaParser);

    for (let index = 0; index < jobCount; index++) {
      const job = await jobParser.parse(jobElements.nth(index));
      if (!job) {
        console.error(
          `Couldn't parse a job: ${jobElements.nth((index + 1) * this.lastPage)}`,
        );
        continue;
      }
      jobs.push(job);
    }

    return Promise.resolve(jobs);
  }
}
