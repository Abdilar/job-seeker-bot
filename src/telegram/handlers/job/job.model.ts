import { Bot, Context } from "grammy"

export interface IJobHandler {
  register(bot: Bot): void
}