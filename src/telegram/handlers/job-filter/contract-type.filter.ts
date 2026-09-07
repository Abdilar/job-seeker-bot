import { EContractType, IJobFilter } from "../../../types";
import { ContractTypeFilterKeyboard } from "../../keyboards";
import { IJobRenderer } from "../../renders";
import { TelegramContextType } from "../../telegram.model";
import { IJobFilterStrategy } from "./job-filter.model";

export class ContractTypeFilter implements IJobFilterStrategy<EContractType> {
  key: keyof IJobFilter = "contractType";

  constructor(
    private readonly keyboard: ContractTypeFilterKeyboard,
    private readonly jobRenderer: IJobRenderer,
  ) {}

  async show(context: TelegramContextType, page: number): Promise<void> {
    await context.answerCallbackQuery();
    await context.editMessageText("نوع قرارداد را انتخاب کنید:", {
      reply_markup: this.keyboard.create(page),
    });
  }

  async select(context: TelegramContextType, value: EContractType): Promise<void> {
    context.session.jobFilter.contractType = value;
    await context.answerCallbackQuery();
    await this.jobRenderer.render(context, 1, true);
  }

  async clear(context: TelegramContextType): Promise<void> {
    const { contractType, ...restFilter } = context.session.jobFilter;
    context.session.jobFilter = restFilter;
    await context.answerCallbackQuery();
    await this.jobRenderer.render(context, 1, true);
  }
}
