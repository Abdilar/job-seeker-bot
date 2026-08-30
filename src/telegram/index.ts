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
    const jobHandler = new JobHandler(this.jobService)

    this.bot.command('start', context => startHandler.handle(context))

    this.bot.command('jobs', context => jobHandler.handle(context))
  }

  start() {
    this.bot.start();
  }
}
