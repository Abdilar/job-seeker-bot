import { subDays } from "date-fns-jalali";
import { TODAY } from "../constants";

export function convertDaysAgoToJalaliDate(date: string): Date | undefined {
  if (!date) return;
  const today = new Date();
  if (date === TODAY) {
    return today
  }

  const subDaysDate = subDays(today, Number(date));
  return subDaysDate;
}