import { EProvider, IJobFilter } from '../../../types'
import { ProviderFilterKeyboard } from '../../keyboards'
import { IJobRenderer } from '../../renders'
import { TelegramContextType } from '../../telegram.model'
import { IJobFilterStrategy } from './job-filter.model'

export class ProviderFilter implements IJobFilterStrategy<EProvider> {
  key: keyof IJobFilter = 'provider'

  constructor(
    private readonly keyboard: ProviderFilterKeyboard,
    private readonly jobRenderer: IJobRenderer,
  ) {}

  async show(context: TelegramContextType, page: number): Promise<void> {
    await context.answerCallbackQuery()
    await context.editMessageText('منبع را انتخاب کنید:', {
      reply_markup: this.keyboard.create(page),
    })
  }
  async select(context: TelegramContextType, value: EProvider): Promise<void> {
    context.session.jobFilter.provider = value
    await context.answerCallbackQuery()
    await this.jobRenderer.render(context, 1, true)
  }

  async clear(context: TelegramContextType): Promise<void> {
    const { provider: _provider, ...restFilter } = context.session.jobFilter
    context.session.jobFilter = restFilter
    await context.answerCallbackQuery()
    await this.jobRenderer.render(context, 1, true)
  }
}
