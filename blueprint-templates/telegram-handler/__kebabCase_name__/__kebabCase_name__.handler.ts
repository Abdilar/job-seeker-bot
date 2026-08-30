import { Context } from "grammy"
import { I{{pascalCase name}}Handler } from './{{kebabCase name}}.model'

export class {{pascalCase name}} implements I{{pascalCase name}}Handler {
  handle(context: Context): void { }
}