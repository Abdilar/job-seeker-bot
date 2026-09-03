import { Bot, Context } from "grammy";
import { IJobHandler } from "./job.model";
import { IJobService } from "../../../services";
import { PAGINATION_LIMIT } from "../../../constants";
import {
  JobDetailsKeyboard,
  JobFilterKeyboard,
  JobListKeyboard,
  PaginationKeyboard,
} from "../../keyboards";
import {
  JOB_DETAILS_KEYBOARD_PREFIX,
  PAGINATION_KEYBOARD_PREFIX,
} from "../../telegram.constant";
import { JobFormatter } from "../../formatters";
import { ContractTypeFilterKeyboard } from "../../keyboards/contract-type-filter";

export class JobHandler implements IJobHandler {
  private readonly paginationKeyboard = new PaginationKeyboard();
  private readonly detailsKeyboard = new JobDetailsKeyboard();
  private readonly listKeyboard = new JobListKeyboard();
  private readonly contractTypeFilterKeyboard =
    new ContractTypeFilterKeyboard();
  private readonly jobFilterKeyboard = new JobFilterKeyboard()
  private readonly jobFormatter = new JobFormatter();

  constructor(private readonly jobService: IJobService) {}

  register(bot: Bot): void {
    bot.command("jobs", (context) => this.handle(context));

    const paginationRegex = new RegExp(
      `^${PAGINATION_KEYBOARD_PREFIX}:(\\d+)$`,
    );
    const jobDetailsRegex = new RegExp(
      `^${JOB_DETAILS_KEYBOARD_PREFIX}:([^:]+):(\\d+)$`,
    );
    bot.callbackQuery(paginationRegex, (context) =>
      this.handlePagination(context),
    );

    bot.callbackQuery(jobDetailsRegex, (context) =>
      this.handleDetails(context),
    );

    bot.callbackQuery("jobs:filters", (context) =>
      this.handleJobFilter(context),
    );

    bot.callbackQuery("jobs:filter:contractType", (context) =>
      this.handleContractTypeFilter(context),
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

    const keyboard = this.jobFilterKeyboard.create()
    const paginationKeyboard = this.paginationKeyboard.create(page, totalPages);
    const listKeyboard = this.listKeyboard.create(jobs, page);
    
    keyboard.append(listKeyboard);
    keyboard.append(paginationKeyboard)

    const message = this.jobFormatter.formatList(jobs, page, totalPages);

    const messageOptions = {
      reply_markup: keyboard,
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

  private async handleContractTypeFilter(context: Context): Promise<void> {
    const keyboard = this.contractTypeFilterKeyboard.create()
    await context.answerCallbackQuery()
    await context.editMessageText(
      'نوع قرارداد را انتخاب کنید:',
      { reply_markup: keyboard }
    )
  }

  private async handleJobFilter(context: Context): Promise<void> {
    const keyboard = this.jobFilterKeyboard.createFilterMenu()
    await context.answerCallbackQuery()
    await context.editMessageText(
      'نوع فیلتر را انتخاب کنید:',
      { reply_markup: keyboard }
    )
  }
}
