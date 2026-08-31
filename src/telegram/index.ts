import { Bot } from "grammy";
import { ITelegramBot } from "./telegram.model";
import { JobHandler, StartHandler } from "./handlers";
import { IJobService } from "../services";

export class TelegramBot implements ITelegramBot {
  private readonly bot: Bot;

  constructor(
    token: string,
    private readonly jobService: IJobService
  ) {
    this.bot = new Bot(token);

    this.registerHandlers();
  }

  private registerHandlers(): void {
    new StartHandler().register(this.bot)

    new JobHandler(this.jobService).register(this.bot)
  }

  start() {
    this.bot.start();
  }
}
