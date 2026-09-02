import { IJob } from "../../../types";

export interface IJobFormatter {
  formatList(jobs: Array<IJob>, page: number, totalPages: number, limit: number): string
  formatDetail(job: IJob): string
}