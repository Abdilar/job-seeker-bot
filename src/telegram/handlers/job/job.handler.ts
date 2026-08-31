import { Context } from "grammy"
import { IJobHandler } from './job.model'
import { IJobService } from "../../../services"
import { PAGINATION_LIMIT } from "../../../constants"
import { PaginationKeyboard } from "../../keyboards"

export class JobHandler implements IJobHandler {
  private readonly keyboard = new PaginationKeyboard()

  constructor(
    private readonly jobService: IJobService
  ) {}

  async handle(context: Context, page: number = 1): Promise<void> {
      const jobs = await this.jobService.getJobs(1, PAGINATION_LIMIT)
      const totalJobs = await this.jobService.count()

      if (!jobs.length) {
        await context.reply('متاسفانه شغلی یافت نشد!')
        return
      }

      const totalPages = Math.ceil(totalJobs / PAGINATION_LIMIT)

      const keyboard = this.keyboard.create(page, totalPages, 'شغل')

      const message = jobs.map((job, index) => {
        return `${index + 1}. ${job.title}\n${job.company.fullName}`
      }).join("\n\n")

      await context.reply(message, {reply_markup: keyboard})
   }
}