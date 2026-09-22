import type { Context, SessionFlavor } from 'grammy'
import type { IJobFilter } from '../types'

export interface ITelegramBot {
  start(): Promise<void>
}

export interface ITelegramSession {
  jobFilter: IJobFilter
}

export type TelegramContextType = Context & SessionFlavor<ITelegramSession>
