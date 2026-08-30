import { Context } from "grammy";
import { IStartHandler } from "./start.model";

export class StartHandler implements IStartHandler {
  async handle(context: Context): Promise<void> {
    await context.reply(
      "به ربات جستجوی کار خوش آمدید! 👋\n\nبرای دیدن آخرین شغل‌ها از دستور /jobs استفاده کنید.",
    );
  }
}
