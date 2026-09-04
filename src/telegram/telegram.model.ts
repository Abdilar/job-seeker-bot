import { Context, SessionFlavor } from "grammy"
import { IJobFilter } from "../types"

export interface ITelegramBot {
  start(): void
}

export interface ITelegramSession {
  jobFilter: IJobFilter
}

export type TelegramContextType = Context & SessionFlavor<ITelegramSession>