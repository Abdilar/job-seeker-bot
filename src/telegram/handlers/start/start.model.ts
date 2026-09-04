import { Bot } from "grammy";
import { TelegramContextType } from "../../telegram.model";

export interface IStartHandler {
  register(bot: Bot<TelegramContextType>): void
}