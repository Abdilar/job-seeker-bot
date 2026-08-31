import { Bot } from "grammy";

export interface IStartHandler {
  register(bot: Bot): void
}