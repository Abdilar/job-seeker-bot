import { ICrawledJob, IJob } from "../../types";

export type SaveJobsResultType = {
  total: number;
  saved: number;
  failed: number;
};

export interface IJobService {
  isValid(data: ICrawledJob): boolean;
  save(data: ICrawledJob): Promise<IJob>;
  saveAll(data: Array<ICrawledJob>): Promise<SaveJobsResultType>;
}
