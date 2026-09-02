import { Bot, Context } from "grammy";
import { IJobHandler } from "./job.model";
import { IJobService } from "../../../services";
import { PAGINATION_LIMIT } from "../../../constants";
import { JobDetailsKeyboard, JobListKeyboard, PaginationKeyboard } from "../../keyboards";
import { JOB_DETAILS_KEYBOARD_PREFIX, PAGINATION_KEYBOARD_PREFIX } from "../../telegram.constant";
import { JobFormatter } from "../../formatters";

export class JobHandler implements IJobHandler {
  private readonly paginationKeyboard = new PaginationKeyboard();
  private readonly detailsKeyboard = new JobDetailsKeyboard();
  private readonly listKeyboard = new JobListKeyboard();
  private readonly jobFormatter = new JobFormatter();

  constructor(private readonly jobService: IJobService) {}

  register(bot: Bot): void {
    bot.command("jobs", (context) => this.handle(context));

    const paginationRegex = new RegExp(
      `^${PAGINATION_KEYBOARD_PREFIX}:(\\d+)$`,
    );
    const jobDetailsRegex = new RegExp(
      `^${JOB_DETAILS_KEYBOARD_PREFIX}:([^:]+):(\\d+)$`
    )
    bot.callbackQuery(paginationRegex, (context) =>
      this.handlePagination(context),
    );

    bot.callbackQuery(jobDetailsRegex, (context) =>
      this.handleDetails(context),
    );
  }

  private async handle(
    context: Context,
    page: number = 1,
    edit = false,
  ): Promise<void> {
    const jobs = await this.jobService.getJobs(page, PAGINATION_LIMIT);
    const totalJobs = await this.jobService.count();

    if (!jobs.length) {
      await context.reply("متاسفانه شغلی یافت نشد!");
      return;
    }

    const totalPages = Math.ceil(totalJobs / PAGINATION_LIMIT);

    const keyboard = this.paginationKeyboard.create(
      page,
      totalPages,
    );

    const listKeyboard = this.listKeyboard.create(jobs, page)

    listKeyboard.append(keyboard)

    const message = this.jobFormatter.formatList(jobs, page, totalPages);

    const messageOptions = {
      reply_markup: listKeyboard,
      parse_mode: "HTML" as const,
      link_preview_options: {
        is_disabled: true,
      },
    };

    if (edit) {
      await context.editMessageText(message, messageOptions);
      return;
    }

    await context.reply(message, messageOptions);
  }

  private async handleDetails(context: Context): Promise<void> {
    const jobId = context.match?.[1];
    const page = Number(context.match?.[2]);

    if (!jobId) {
      return;
    }

    const job = await this.jobService.getJob(jobId);

    if (!job) {
      await context.answerCallbackQuery({
        text: "این موقعیت شغلی پیدا نشد.",
      });
      return;
    }

    const message = this.jobFormatter.formatDetail(job);
    const keyboard = this.detailsKeyboard.create(job.url, page);

    await context.answerCallbackQuery();
    await context.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: keyboard,
      link_preview_options: {
        is_disabled: true,
      },
    });
  }

  private async handlePagination(context: Context): Promise<void> {
    const page = Number(context.match?.[1]);
    await context.answerCallbackQuery();
    await this.handle(context, page, true);
  }
}
