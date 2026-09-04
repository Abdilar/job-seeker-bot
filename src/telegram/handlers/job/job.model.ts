import { Bot } from "grammy";
import { TelegramContextType } from "../../telegram.model";

export interface IJobHandler {
  register(bot: Bot<TelegramContextType>): void;
}
