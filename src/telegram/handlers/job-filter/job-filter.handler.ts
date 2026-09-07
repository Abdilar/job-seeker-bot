import { Bot } from "grammy";
import { IJobFilterHandler } from "./job-filter.model";
import { TelegramContextType } from "../../telegram.model";
import {
  ContractTypeFilterKeyboard,
  JobFilterKeyboard,
  ProviderFilterKeyboard,
} from "../../keyboards";
import { EContractType, EProvider } from "../../../types";
import { IJobRenderer } from "../../renders";

export class JobFilterHandler implements IJobFilterHandler {
  private readonly jobFilterKeyboard = new JobFilterKeyboard();
  private readonly contractTypeFilterKeyboard =
    new ContractTypeFilterKeyboard();
  private readonly providerFilterKeyboard = new ProviderFilterKeyboard();

  constructor(
    private readonly jobRenderer: IJobRenderer,
  ) {}

  register(bot: Bot<TelegramContextType>): void {
    // NOTE: Filters
    bot.callbackQuery(/^filters:(\d+)$/, (context) =>
      this.handleFilterMenu(context),
    );

    bot.callbackQuery(/^filters:clear$/, (context) =>
      this.clearFilters(context),
    );

    // NOTE: ContractType filters
    bot.callbackQuery(/^filters:contractType:(\d+)$/, (context) =>
      this.handleContractTypeFilter(context),
    );

    bot.callbackQuery(
      /^filters:contractType:(?!\d+)(?!clear$)([^:]+)$/,
      (context) => this.selectedContractTypeFilter(context),
    );

    bot.callbackQuery(/^filters:contractType:clear$/, (context) =>
      this.clearContractTypeFilter(context),
    );

    // NOTE: Provider Filters
    bot.callbackQuery(/^filters:provider:(\d+)$/, (context) =>
      this.handleProviderFilter(context),
    );

    bot.callbackQuery(
      /^filters:provider:(?!\d+)(?!clear$)([^:]+)$/,
      (context) => this.selectedProviderFilter(context),
    );

    bot.callbackQuery(/^filters:provider:clear$/, (context) =>
      this.clearProviderFilter(context),
    );
  }

  private async handleFilterMenu(context: TelegramContextType): Promise<void> {
    const page = Number(context.match?.[1]);
    const keyboard = this.jobFilterKeyboard.createFilterMenu(page);
    await context.answerCallbackQuery();
    await context.editMessageText("نوع فیلتر را انتخاب کنید:", {
      reply_markup: keyboard,
    });
  }

  private async handleContractTypeFilter(
    context: TelegramContextType,
  ): Promise<void> {
    const page = Number(context.match?.[1]);
    const keyboard = this.contractTypeFilterKeyboard.create(page);
    await context.answerCallbackQuery();
    await context.editMessageText("نوع قرارداد را انتخاب کنید:", {
      reply_markup: keyboard,
    });
  }

  private async selectedContractTypeFilter(
    context: TelegramContextType,
  ): Promise<void> {
    const contractType = context.match?.[1] as EContractType;
    context.session.jobFilter.contractType = contractType;
    await context.answerCallbackQuery();
    this.jobRenderer.render(context, 1, true);
  }

  private async clearContractTypeFilter(
    context: TelegramContextType,
  ): Promise<void> {
    const { contractType, ...restFilter } = context.session.jobFilter;
    context.session.jobFilter = restFilter;
    await context.answerCallbackQuery();
    this.jobRenderer.render(context, 1, true);
  }

  private async handleProviderFilter(
    context: TelegramContextType,
  ): Promise<void> {
    const page = Number(context.match?.[1]);
    const keyboard = this.providerFilterKeyboard.create(page);
    await context.answerCallbackQuery();
    await context.editMessageText("منبع را انتخاب کنید:", {
      reply_markup: keyboard,
    });
  }

  private async selectedProviderFilter(
    context: TelegramContextType,
  ): Promise<void> {
    const provider = context.match?.[1] as EProvider;
    context.session.jobFilter.provider = provider;
    await context.answerCallbackQuery();
    this.jobRenderer.render(context, 1, true);
  }

  private async clearProviderFilter(
    context: TelegramContextType,
  ): Promise<void> {
    const { provider, ...restFilter } = context.session.jobFilter;
    context.session.jobFilter = restFilter;
    await context.answerCallbackQuery();
    this.jobRenderer.render(context, 1, true);
  }

  private async clearFilters(context: TelegramContextType): Promise<void> {
    context.session.jobFilter = {};
    await context.answerCallbackQuery();
    this.jobRenderer.render(context, 1, true);
  }
}
