import { InlineKeyboard } from "grammy"

export interface IProviderFilterKeyboard {
  create(page: number): InlineKeyboard 
}