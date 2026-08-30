import { Bot } from "grammy";
import { ITelegramBot } from "./telegram.model";
import { StartHandler } from "./handlers";

export class TelegramBot implements ITelegramBot {
  private readonly bot: Bot;

  constructor(token: string) {
    this.bot = new Bot(token);

    this.registerHandler();
  }

  private registerHandler(): void {
    const startHandler = new StartHandler()

    this.bot.command('start', context => startHandler.handle(context))
  }

  start() {
    this.bot.start();
  }
}
