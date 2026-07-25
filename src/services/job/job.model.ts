import { Job } from "@prisma/client";
import { IJob } from "../../types/job.model";

export type SaveJobsResultType = {
  total: number;
  saved: number;
  failed: number;
};

export interface IJobService {
  isValid(data: IJob): boolean;
  save(data: IJob): Promise<Job>;
  saveAll(data: Array<IJob>): Promise<SaveJobsResultType>;
}
