import { InlineKeyboard } from "grammy"

export interface IJobFilterKeyboard {
  create(page: number): InlineKeyboard 
  createFilterMenu(page: number): InlineKeyboard 
}