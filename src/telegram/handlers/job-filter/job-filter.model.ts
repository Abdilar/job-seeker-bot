import { Bot } from 'grammy'
import { TelegramContextType } from '../../telegram.model'
import { IJobFilter } from '../../../types'

export interface IJobFilterHandler {
  register(bot: Bot<TelegramContextType>): void
}

export interface IJobFilterStrategy<T> {
  key: keyof IJobFilter
  show(context: TelegramContextType, page: number): Promise<void>
  select(context: TelegramContextType, value: T): Promise<void>
  clear(context: TelegramContextType): Promise<void>
}
