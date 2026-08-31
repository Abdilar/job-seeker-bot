import { Bot } from "grammy";

export interface IJobHandler {
  register(bot: Bot): void;
}
