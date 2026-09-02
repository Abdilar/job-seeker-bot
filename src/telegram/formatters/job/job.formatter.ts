import { CONTRACT_TYPE_MAP, PAGINATION_LIMIT } from "../../../constants";
import { IJob } from "../../../types";
import { toJalali } from "../../../utilities";
import { IJobFormatter } from "./job.model";

export class JobFormatter implements IJobFormatter {
  formatList(jobs: Array<IJob>, page: number, totalPages: number): string {
    const jobMessage = jobs.map((job, index) => {
      const jobIndex = index + 1 + (page - 1) * PAGINATION_LIMIT;
      
      return `
<b>${jobIndex}. ${job.title}</b>
${job.company.fullName}
      `
    }).join('\n')

    return jobMessage.concat(`\n\n\nصفحه ${page} از ${totalPages}`);
  }

  formatDetail(job: IJob): string {
    return `
<b>💼 ${job.title}</b>
🏢 شرکت: <b>${job.company.fullName}</b>
📍 موقعیت: <b>${job.location.country}, ${job.location.province}</b>
📄 نوع قرارداد: <b>${CONTRACT_TYPE_MAP[job.contractType]}</b>
💰 حقوق: <b>${job.salary || "نامشخص"}</b>
📅 تاریخ انتشار: <b>${toJalali(job.postedAt ?? new Date())}</b>
🌐 منبع: <b>${job.provider}</b>
    `.trim()
  }
}
