import { InlineKeyboard } from "grammy";
import { IJobFilterKeyboard } from "./job-filter.model";

export class JobFilterKeyboard implements IJobFilterKeyboard {
  create(page: number): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    return keyboard.text("فیلترها 🔎", `filters:${page}`).row();
  }

  createFilterMenu(page: number): InlineKeyboard {
    const keyboard = new InlineKeyboard();
    return keyboard
      .text("نوع قرارداد 📄", `filters:contractType:${page}`)
      .row()
      .text("منبع 🏢", `filters:provider:${page}`)
      .row()
      .text('حذف فیلترها ❌', 'filters:clear')
      .text('بازگشت به لیست ⬅️', `jobs:${page}`)
      .row()
  }
}
