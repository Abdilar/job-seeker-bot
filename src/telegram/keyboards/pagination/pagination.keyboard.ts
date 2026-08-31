import { InlineKeyboard } from "grammy";
import { IPaginationKeyboard } from "./pagination.model";

export class PaginationKeyboard implements IPaginationKeyboard {
  create(page: number, totalPages: number, prefix: string): InlineKeyboard {
    const keyboard = new InlineKeyboard()

    if (page > 1) {
      keyboard.text('⬅️ قبلی', `${prefix}:${page - 1}`)
    }

    if (page < totalPages) {
      keyboard.text('➡️ بعدی', `${prefix}:${page + 1}`)
    }

    return keyboard
  }
}