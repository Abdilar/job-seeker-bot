import { Bot } from 'grammy'
import { IJobHandler } from './job.model'
import { IJobService } from '../../../services'
import { JobFormatter } from '../../formatters'
import { TelegramContextType } from '../../telegram.model'
import { JobDetailsKeyboard } from '../../keyboards'
import { IJobRenderer } from '../../renders'

export class JobHandler implements IJobHandler {
  private readonly detailsKeyboard = new JobDetailsKeyboard()
  private readonly jobFormatter = new JobFormatter()

  constructor(
    private readonly jobService: IJobService,
    private readonly jobRenderer: IJobRenderer,
  ) {}

  register(bot: Bot<TelegramContextType>): void {
    bot.command('jobs', (context) => this.jobRenderer.render(context))

    bot.callbackQuery(/^jobs:([^:]+):(\d+)$/, (context) => this.handleDetails(context))

    bot.callbackQuery(/^jobs:(\d+)$/, (context) => this.showJobs(context))
  }

  private async handleDetails(context: TelegramContextType): Promise<void> {
    const jobId = context.match?.[1]
    const page = Number(context.match?.[2])

    if (!jobId) {
      return
    }

    const job = await this.jobService.getJob(jobId)

    if (!job) {
      await context.answerCallbackQuery({
        text: 'این موقعیت شغلی پیدا نشد.',
      })
      return
    }

    const message = this.jobFormatter.formatDetail(job)
    const keyboard = this.detailsKeyboard.create(job.url, page)

    await context.answerCallbackQuery()
    await context.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: {
        is_disabled: true,
      },
    })
  }

  private async showJobs(context: TelegramContextType): Promise<void> {
    const page = Number(context.match?.[1])
    await context.answerCallbackQuery()
    await this.jobRenderer.render(context, page, true)
  }
}
