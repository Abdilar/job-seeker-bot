import { InlineKeyboard } from "grammy"

export interface IJobDetailsKeyboard {
  create(jobUrl: string, page: number): InlineKeyboard 
}