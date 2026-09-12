import { IJobService } from '../../../services'
import { isEmptyObject } from '../../../utilities'
import { CONTRACT_TYPE_MAP, PAGINATION_LIMIT, PROVIDER_MAP } from '../../constants'
import { JobFormatter } from '../../formatters'
import { JobFilterKeyboard, JobListKeyboard, PaginationKeyboard } from '../../keyboards'
import { TelegramContextType } from '../../telegram.model'
import { IJobRenderer } from './job.model'

export class JobRenderer implements IJobRenderer {
  private readonly paginationKeyboard = new PaginationKeyboard()
  private readonly listKeyboard = new JobListKeyboard()
  private readonly jobFilterKeyboard = new JobFilterKeyboard()
  private readonly jobFormatter = new JobFormatter()

  constructor(private readonly jobService: IJobService) {}

  async render(context: TelegramContextType, page: number = 1, edit = false): Promise<void> {
    const jobs = await this.jobService.getJobs(page, PAGINATION_LIMIT, context.session.jobFilter)
    const totalJobs = await this.jobService.count(context.session.jobFilter)

    if (!jobs.length) {
      await context.reply('متاسفانه شغلی یافت نشد!')
      return
    }

    const totalPages = Math.ceil(totalJobs / PAGINATION_LIMIT)

    const keyboard = this.jobFilterKeyboard.create(page)
    const listKeyboard = this.listKeyboard.create(jobs, page)
    const paginationKeyboard = this.paginationKeyboard.create(page, totalPages)

    keyboard.append(listKeyboard)
    keyboard.append(paginationKeyboard)

    let message = this.jobFormatter.formatList(jobs, page, totalPages)

    if (!isEmptyObject(context.session.jobFilter)) {
      let filterMessage = 'فیلترهای انتخاب شده:\n'

      if (context.session.jobFilter.contractType) {
        filterMessage += `
نوع قرارداد: <b>${CONTRACT_TYPE_MAP[context.session.jobFilter.contractType]}</b>
        `
      }

      if (context.session.jobFilter.provider) {
        filterMessage += `
منبع: <b>${PROVIDER_MAP[context.session.jobFilter.provider]}</b>
        
  
 `
      }
      message = filterMessage + message
    }

    const messageOptions = {
      reply_markup: keyboard,
      parse_mode: 'HTML' as const,
      link_preview_options: {
        is_disabled: true,
      },
    }

    if (edit) {
      await context.editMessageText(message, messageOptions)
      return
    }

    await context.reply(message, messageOptions)
  }
}
