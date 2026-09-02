import { InlineKeyboard } from "grammy";
import { IPaginationKeyboard } from "./pagination.model";
import { PAGINATION_KEYBOARD_PREFIX } from "../../telegram.constant";

export class PaginationKeyboard implements IPaginationKeyboard {
  create(page: number, totalPages: number): InlineKeyboard {
    const keyboard = new InlineKeyboard()

    if (page > 1) {
      keyboard.text('قبلی ⬅️', `${PAGINATION_KEYBOARD_PREFIX}:${page - 1}`)
    }

    if (page < totalPages) {
      keyboard.text('➡️ بعدی', `${PAGINATION_KEYBOARD_PREFIX}:${page + 1}`)
    }

    return keyboard
  }
}