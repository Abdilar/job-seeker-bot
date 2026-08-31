import { InlineKeyboard } from "grammy";

export interface IPaginationKeyboard {
  create(page: number, totalPages: number, prefix: string): InlineKeyboard 
}