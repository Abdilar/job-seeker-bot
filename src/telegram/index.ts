import { Bot, session } from "grammy";
import { ITelegramBot, ITelegramSession, TelegramContextType } from "./telegram.model";
import { JobHandler, StartHandler } from "./handlers";
import { IJobService } from "../services";

export class TelegramBot implements ITelegramBot {
  private readonly bot: Bot<TelegramContextType>;

  constructor(
    token: string,
    private readonly jobService: IJobService,
  ) {
    this.bot = new Bot<TelegramContextType>(token);
    this.bot.use(
      session({
        initial: (): ITelegramSession => ({
          jobFilter: {}
        })
      }),
    );

    this.registerHandlers();
  }

  private registerHandlers(): void {
    new StartHandler().register(this.bot);

    new JobHandler(this.jobService).register(this.bot);
  }

  start() {
    this.bot.start();
  }
}
