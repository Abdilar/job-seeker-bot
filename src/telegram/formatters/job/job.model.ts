import { IJob } from "../../../types";

export interface IJobFormatter {
  formatList(jobs: Array<IJob>, page: number, totalPages: number): string
  formatDetail(job: IJob): string
}