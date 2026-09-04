import { InlineKeyboard } from "grammy";
import { IJobDetailsKeyboard } from "./job-details.model";
import { PAGINATION_KEYBOARD_PREFIX } from "../../telegram.constant";

export class JobDetailsKeyboard implements IJobDetailsKeyboard {
  create(jobUrl: string, page: number): InlineKeyboard {
    return new InlineKeyboard()
      .url("مشاهده آگهی 🔗", jobUrl)
      .row()
      .text("بازگشت به لیست ⬅️", `jobs:${page}`);
  }
}
