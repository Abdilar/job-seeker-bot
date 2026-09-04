import { Bot, Context } from "grammy";
import { IJobHandler } from "./job.model";
import { IJobService } from "../../../services";
import { CONTRACT_TYPE_MAP, PAGINATION_LIMIT, PROVIDER_MAP } from "../../../constants";
import {
  JobDetailsKeyboard,
  JobFilterKeyboard,
  JobListKeyboard,
  PaginationKeyboard,
} from "../../keyboards";
import { JobFormatter } from "../../formatters";
import { ContractTypeFilterKeyboard } from "../../keyboards/contract-type-filter";
import { EContractType, IJobFilter } from "../../../types";
import { TelegramContextType } from "../../telegram.model";

export class JobHandler implements IJobHandler {
  private readonly paginationKeyboard = new PaginationKeyboard();
  private readonly detailsKeyboard = new JobDetailsKeyboard();
  private readonly listKeyboard = new JobListKeyboard();
  private readonly contractTypeFilterKeyboard =
    new ContractTypeFilterKeyboard();
  private readonly jobFilterKeyboard = new JobFilterKeyboard()
  private readonly jobFormatter = new JobFormatter();

  constructor(private readonly jobService: IJobService) {}

  register(bot: Bot<TelegramContextType>): void {
    bot.command("jobs", (context) => this.handle(context));

    bot.callbackQuery(/^filters:(\d+)$/, (context) =>
      this.handleFilterMenu(context),
    );

    bot.callbackQuery(/^jobs:([^:]+):(\d+)$/, (context) =>
      this.handleDetails(context),
    );

    bot.callbackQuery(/^jobs:(\d+)$/, (context) =>
      this.showJobs(context),
    );

    bot.callbackQuery(/^filters:contractType:(\d+)$/, (context) =>
      this.handleContractTypeFilter(context),
    );

    bot.callbackQuery(/^filters:contractType:(?!\d+)([^:]+)$/, (context) =>
      this.handleContractTypeFilterSelected(context),
    );
  }

  private async handle(
    context: Context,
    page: number = 1,
    edit = false,
    filters?: IJobFilter
  ): Promise<void> {
    const jobs = await this.jobService.getJobs(page, PAGINATION_LIMIT, filters);
    const totalJobs = await this.jobService.count(filters);

    if (!jobs.length) {
      await context.reply("متاسفانه شغلی یافت نشد!");
      return;
    }

    const totalPages = Math.ceil(totalJobs / PAGINATION_LIMIT);

    const keyboard = this.jobFilterKeyboard.create(page)
    const listKeyboard = this.listKeyboard.create(jobs, page);
    const paginationKeyboard = this.paginationKeyboard.create(page, totalPages);
    
    keyboard.append(listKeyboard);
    keyboard.append(paginationKeyboard)

    let message = this.jobFormatter.formatList(jobs, page, totalPages);

    if (filters) {
      let filterMessage =  "فیلترهای انتخاب شده:\n"

      filters.contractType && (filterMessage += `
نوع قرارداد: <b>${CONTRACT_TYPE_MAP[filters.contractType]}</b>
      `)

      filters.provider && (filterMessage += `
منبع: <b>${PROVIDER_MAP[filters.provider]}</b>
      

`)
      message = filterMessage + message
    }

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

  private async showJobs(context: Context): Promise<void> {
    const page = Number(context.match?.[1]);
    await context.answerCallbackQuery();
    await this.handle(context, page, true);
  }

  private async handleContractTypeFilter(context: Context): Promise<void> {
    const page = Number(context.match?.[1])
    console.log('contract type clicked: ', page);

    const keyboard = this.contractTypeFilterKeyboard.create(page)
    await context.answerCallbackQuery()
    await context.editMessageText(
      'نوع قرارداد را انتخاب کنید:',
      { reply_markup: keyboard }
    )
  }

  private async handleFilterMenu(context: Context): Promise<void> {
    const page = Number(context.match?.[1])
    console.log('filter clicked: ', page);
    const keyboard = this.jobFilterKeyboard.createFilterMenu(page)
    await context.answerCallbackQuery()
    await context.editMessageText(
      'نوع فیلتر را انتخاب کنید:',
      { reply_markup: keyboard }
    )
  }

  private async handleContractTypeFilterSelected(context: Context): Promise<void> {
    const contractType = context.match?.[1] as EContractType
    console.log('contract type selected: ', {contractType});
    await context.answerCallbackQuery()
    this.handle(context, 1, true, {contractType})
  }
}
