import { Bot, Context } from "grammy";
import { IJobHandler } from "./job.model";
import { IJobService } from "../../../services";
import { PAGINATION_LIMIT } from "../../../constants";
import { PaginationKeyboard } from "../../keyboards";
import { PAGINATION_KEYBOARD_PREFIX } from "../../telegram.constant";
import { JobFormatter } from "../../formatters";

export class JobHandler implements IJobHandler {
  private readonly keyboard = new PaginationKeyboard();
  private readonly jobFormatter = new JobFormatter()

  constructor(private readonly jobService: IJobService) {}

  register(bot: Bot): void {
    bot.command("jobs", (context) => this.handle(context));

    const paginationRegex = new RegExp(
      `^${PAGINATION_KEYBOARD_PREFIX}:(\\d+)$`,
    );
    bot.callbackQuery(paginationRegex, (context) =>
      this.handlePagination(context),
    );
  }

  private async handle(context: Context, page: number = 1, edit = false): Promise<void> {
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

    const message = this.jobFormatter.formatList(jobs, page, totalPages, PAGINATION_LIMIT)

    const messageOptions = {
      reply_markup: keyboard,
      parse_mode: "HTML" as const,
      link_preview_options: {
        is_disabled: true,
      }
    }

    if (edit) {
      await context.editMessageText(message, messageOptions);
      return
    }

    await context.reply(message, messageOptions);
  }

  private async handlePagination(context: Context): Promise<void> {
    const page = Number(context.match?.[1]);
    await context.answerCallbackQuery();
    await this.handle(context, page, true);
  }
}
