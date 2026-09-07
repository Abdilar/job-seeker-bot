import { Bot } from "grammy"
import { TelegramContextType } from "../../telegram.model"

export interface IJobFilterHandler {
  register(bot: Bot<TelegramContextType>): void
}