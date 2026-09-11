import { Bot, session } from 'grammy'
import { ITelegramBot, ITelegramSession, TelegramContextType } from './telegram.model'
import { JobHandler, JobFilterHandler, StartHandler } from './handlers'
import { IJobService } from '../services'
import { IJobRenderer, JobRenderer } from './renders'

export class TelegramBot implements ITelegramBot {
  private readonly bot: Bot<TelegramContextType>

  constructor(
    token: string,
    private readonly jobService: IJobService,
  ) {
    this.bot = new Bot<TelegramContextType>(token)
    this.bot.use(
      session({
        initial: (): ITelegramSession => ({
          jobFilter: {},
        }),
      }),
    )

    this.registerHandlers()
  }

  private registerHandlers(): void {
    const jobRenderer: IJobRenderer = new JobRenderer(this.jobService)
    new StartHandler().register(this.bot)

    new JobHandler(this.jobService, jobRenderer).register(this.bot)
    new JobFilterHandler(jobRenderer).register(this.bot)
  }

  start() {
    this.bot.start()
  }
}
