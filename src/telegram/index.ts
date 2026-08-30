import { Bot } from "grammy";
import { ITelegramBot } from "./telegram.model";

export class TelegramBot implements ITelegramBot {
  private readonly bot: Bot;

  constructor(token: string) {
    this.bot = new Bot(token);

    this.startHandler();
  }

  private startHandler() {
    this.bot.command("start", async (context) => {
      await context.reply("به ربات کاریابی خوش آمدید! 👋");
    });
  }

  start() {
    this.bot.start();
  }
}
