import { Bot } from "grammy";
import { IStartHandler } from "./start.model";
import { TelegramContextType } from "../../telegram.model";

export class StartHandler implements IStartHandler {
  register(bot: Bot<TelegramContextType>) {
    bot.command("start", (context) => this.handle(context));
  }

  private async handle(context: TelegramContextType): Promise<void> {
    await context.reply(
      "به ربات جستجوی کار خوش آمدید! 👋\n\nبرای دیدن آخرین شغل‌ها از دستور /jobs استفاده کنید.",
    );
  }
}
