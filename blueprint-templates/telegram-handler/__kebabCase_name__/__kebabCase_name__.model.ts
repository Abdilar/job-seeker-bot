import { Bot } from 'grammy'
import { TelegramContextType } from '../../telegram.model'

export interface I{{pascalCase name}}Handler {
  register(bot: Bot<TelegramContextType>): void
}