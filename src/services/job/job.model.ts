import { ICrawledJob, IJob, IJobFilter } from "../../types";

export type SaveJobsResultType = {
  total: number;
  saved: number;
  failed: number;
};

export interface IJobService {
  isValid(data: ICrawledJob): boolean;
  save(data: ICrawledJob): Promise<IJob>;
  saveAll(data: Array<ICrawledJob>): Promise<SaveJobsResultType>;
  getJobs(page: number, limit: number, filter?: IJobFilter): Promise<IJob[]>
  getJob(id: string): Promise<IJob | null>
  count(): Promise<number>
}
