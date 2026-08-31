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

    this.registerHandler();
  }

  private registerHandler(): void {
    const startHandler = new StartHandler()

    new JobHandler(this.jobService).register(this.bot)

    this.bot.command('start', context => startHandler.handle(context))
  }

  start() {
    this.bot.start();
  }
}
