import { Page } from "playwright";
import { IJobProvider } from "../job.model";
import { JobProvider } from "../job.provider";
import { JobInJaProduct } from "./job-in-ja.product";
import { JobInJaParser, JobParser } from "../../parser";

export class JobInJaCreator extends JobProvider {
  protected async createProvider(page: Page): Promise<IJobProvider> {
    const jobInJaParser = new JobInJaParser()
    const jobParser = new JobParser(jobInJaParser)
    const provider = new JobInJaProduct(page, jobParser);
    await provider.initialize();
    return provider;
  }
}