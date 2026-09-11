import { Bot } from 'grammy'
import { I{{pascalCase name}}Handler } from './{{kebabCase name}}.model'
import { TelegramContextType } from '../../telegram.model'

export class {{pascalCase name}}Handler implements I{{pascalCase name}}Handler {
  register(bot: Bot<TelegramContextType>): void { }
}