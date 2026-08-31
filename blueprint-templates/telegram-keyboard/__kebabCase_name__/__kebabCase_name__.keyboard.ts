import { InlineKeyboard } from "grammy"
import { I{{pascalCase name}}Keyboard } from './{{kebabCase name}}.model'

export class {{pascalCase name}}Keyboard implements I{{pascalCase name}}Keyboard {
  create(prefix: string): InlineKeyboard { }
}