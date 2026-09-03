import { InlineKeyboard } from "grammy";
import { IJobFilterKeyboard } from "./job-filter.model";

export class JobFilterKeyboard implements IJobFilterKeyboard {
  create(): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    return keyboard.text("فیلترها 🔎", "jobs:filters").row();
  }

  createFilterMenu(): InlineKeyboard {
    const keyboard = new InlineKeyboard();
    return keyboard
      .text("نوع قرارداد 📄", `filters:contractType`)
      .row()
      .text("منبع 🏢", "filters:provider")
      .row()
      .text('حذف فیلترها ❌', 'filters:clear')
      .text('بازگشت به لیست ⬅️', 'filters:back')
      .row()
  }
}
