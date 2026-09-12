import { Bot } from 'grammy'
import { IJobFilterHandler } from './job-filter.model'
import { TelegramContextType } from '../../telegram.model'
import {
  ContractTypeFilterKeyboard,
  JobFilterKeyboard,
  ProviderFilterKeyboard,
} from '../../keyboards'
import { IJobRenderer } from '../../renders'
import { ContractTypeFilter } from './contract-type.filter'
import { ProviderFilter } from './provider.filter'
import { EContractType, EProvider } from '../../../types'

export class JobFilterHandler implements IJobFilterHandler {
  private readonly jobFilterKeyboard = new JobFilterKeyboard()
  private readonly contractTypeFilter: ContractTypeFilter
  private readonly providerFilter: ProviderFilter

  constructor(private readonly jobRenderer: IJobRenderer) {
    this.contractTypeFilter = new ContractTypeFilter(
      new ContractTypeFilterKeyboard(),
      this.jobRenderer,
    )

    this.providerFilter = new ProviderFilter(new ProviderFilterKeyboard(), this.jobRenderer)
  }

  register(bot: Bot<TelegramContextType>): void {
    // NOTE: Filters
    bot.callbackQuery(/^filters:(\d+)$/, (context) => this.handleFilterMenu(context))

    bot.callbackQuery(/^filters:clear$/, (context) => this.clearFilters(context))

    // NOTE: ContractType filters
    bot.callbackQuery(/^filters:contractType:(.+)$/, async (context) => {
      const action = context.match?.[1]

      if (/^\d+$/.test(action)) {
        await this.contractTypeFilter.show(context, Number(action))
        return
      }

      if (action === 'clear') {
        await this.contractTypeFilter.clear(context)
        return
      }

      await this.contractTypeFilter.select(context, action as EContractType)
    })

    // NOTE: Provider Filters
    bot.callbackQuery(/^filters:provider:(.+)$/, async (context) => {
      const action = context.match?.[1]

      if (/^\d+$/.test(action)) {
        await this.providerFilter.show(context, Number(action))
        return
      }

      if (action === 'clear') {
        await this.providerFilter.clear(context)
        return
      }

      await this.providerFilter.select(context, action as EProvider)
    })
  }

  private async handleFilterMenu(context: TelegramContextType): Promise<void> {
    const page = Number(context.match?.[1])
    const keyboard = this.jobFilterKeyboard.createFilterMenu(page)
    await context.answerCallbackQuery()
    await context.editMessageText('نوع فیلتر را انتخاب کنید:', {
      reply_markup: keyboard,
    })
  }

  private async clearFilters(context: TelegramContextType): Promise<void> {
    context.session.jobFilter = {}
    await context.answerCallbackQuery()
    await this.jobRenderer.render(context, 1, true)
  }
}
