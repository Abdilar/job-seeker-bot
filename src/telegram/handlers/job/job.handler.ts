import { Bot, Context } from "grammy";
import { IJobHandler } from "./job.model";
import { IJobService } from "../../../services";
import { PAGINATION_LIMIT } from "../../../constants";
import { PaginationKeyboard } from "../../keyboards";
import { PAGINATION_KEYBOARD_PREFIX } from "../../telegram.constant";

export class JobHandler implements IJobHandler {
  private readonly keyboard = new PaginationKeyboard();

  constructor(private readonly jobService: IJobService) {}

  register(bot: Bot) {
    bot.command("jobs", (context) => this.handle(context));

    const paginationRegex = new RegExp(
      `^${PAGINATION_KEYBOARD_PREFIX}:(\\d+)$`,
    );
    bot.callbackQuery(paginationRegex, (context) =>
      this.paginationHandler(context),
    );
  }

  private async handle(context: Context, page: number = 1): Promise<void> {
    const jobs = await this.jobService.getJobs(page, PAGINATION_LIMIT);
    const totalJobs = await this.jobService.count();

    if (!jobs.length) {
      await context.reply("متاسفانه شغلی یافت نشد!");
      return;
    }

    const totalPages = Math.ceil(totalJobs / PAGINATION_LIMIT);

    const keyboard = this.keyboard.create(
      page,
      totalPages,
      PAGINATION_KEYBOARD_PREFIX,
    );

    const jobMessage = jobs
      .map((job, index) => {
        const jobIndex = (index + 1) + ((page - 1) * PAGINATION_LIMIT)
        return `${jobIndex}. ${job.title}\n${job.company.fullName}`;
      })
      .join("\n\n");

      const message = jobMessage.concat(`\n\n\nصفحه ${page} از ${totalPages}`)

    await context.reply(message, { reply_markup: keyboard });
  }

  private async paginationHandler(context: Context): Promise<void> {
    const page = Number(context?.match?.[1]);
    await context.answerCallbackQuery();
    await this.handle(context, page);
  }
}
