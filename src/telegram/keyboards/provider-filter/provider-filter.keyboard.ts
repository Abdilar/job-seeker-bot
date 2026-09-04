import { InlineKeyboard } from "grammy";
import { IProviderFilterKeyboard } from "./provider-filter.model";
import { EProvider } from "../../../types";
import { PROVIDER_MAP } from "../../../constants";

export class ProviderFilterKeyboard implements IProviderFilterKeyboard {
  create(page: number): InlineKeyboard {
    const keyboard = new InlineKeyboard();
    for (const provider of Object.values(EProvider)) {
      keyboard
        .text(PROVIDER_MAP[provider], `filters:provider:${provider}`)
        .row();
    }
    return keyboard
      .text("❌ حذف فیلتر", "filters:provider:clear")
      .text("⬅️ بازگشت", `filters:${page}`);
  }
}
