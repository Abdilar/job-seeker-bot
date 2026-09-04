import { InlineKeyboard } from "grammy";
import { IJobFilterKeyboard } from "./job-filter.model";

export class JobFilterKeyboard implements IJobFilterKeyboard {
  create(page: number): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    return keyboard.text("فیلترها 🔎", `jobs:filters:${page}`).row();
  }

  createFilterMenu(page: number): InlineKeyboard {
    const keyboard = new InlineKeyboard();
    return keyboard
      .text("نوع قرارداد 📄", `jobs:filters:contractType:${page}`)
      .row()
      .text("منبع 🏢", "filters:provider")
      .row()
      .text('حذف فیلترها ❌', 'filters:clear')
      .text('بازگشت به لیست ⬅️', `jobs:${page}`)
      .row()
  }
}
