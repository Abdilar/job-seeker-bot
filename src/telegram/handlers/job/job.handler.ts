import { Context } from "grammy"
import { IJobHandler } from './job.model'
import { IJobService } from "../../../services"
import { PAGINATION_LIMIT } from "../../../constants"

export class JobHandler implements IJobHandler {
  constructor(
    private readonly jobService: IJobService
  ) {}

  async handle(context: Context): Promise<void> {
      const jobs = await this.jobService.getJobs(1, PAGINATION_LIMIT)

      if (!jobs.length) {
        await context.reply('متاسفانه شغلی یافت نشد!')
        return
      }

      const message = jobs.map((job, index) => {
        return `${index + 1}. ${job.title}\n${job.company.fullName}`
      }).join("\n\n")

      await context.reply(message)
   }
}