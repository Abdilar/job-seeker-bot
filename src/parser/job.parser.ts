import { EProvider } from "../types";
import { JobInJaParser } from "./job-in-ja/jab-in-ja.parse";
import { IJobParser } from "./job.model";

export class JobParser implements IJobParser {
  create(provider: EProvider) {
    switch (provider) {
      case EProvider.JOB_IN_JA:
        return new JobInJaParser()
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }
}