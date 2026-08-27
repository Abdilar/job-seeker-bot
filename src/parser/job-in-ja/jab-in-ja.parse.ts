import { Locator } from "playwright";
import { EProvider, ICompany, ICrawledJob, ILocation } from "../../types";
import {
  convertDaysAgoToJalaliDate,
  convertPersianContractTypeToEContractType,
  toEnglishDigits,
} from "../../utilities";
import { TODAY } from "../../constants";
import { LOCATION_COUNTRY } from "./job-in-ja.constant";
import { IJobParserStrategy } from "../job.model";

export class JobInJaParser implements IJobParserStrategy {
  async parse(content: Locator): Promise<ICrawledJob | undefined> {
    try {
      const url = await content
        .locator(".c-jobListView__titleLink")
        .getAttribute("href");
      if (!url) {
        throw new Error("Url not found...");
      }
      const title =
        (await content.locator(".c-jobListView__titleLink").textContent()) ||
        "";
      const passedDateAttribute =
        (await content.locator(".c-jobListView__passedDays").textContent()) ||
        "";
      const passedDate =
        toEnglishDigits(passedDateAttribute).replaceAll(/\D/g, "").trim() ||
        TODAY;
      const postedAt = convertDaysAgoToJalaliDate(passedDate);
      const attributes = content.locator(".c-jobListView__metaItem");
      const companyAttribute: string =
        (await attributes.nth(0).locator("span").textContent()) || "";
      const company: ICompany = this.parseCompany(companyAttribute);
      const locationAttribute: string =
        (await attributes.nth(1).locator("span").textContent()) || "";
      const location: ILocation = this.parseLocation(locationAttribute);
      const contractTypeAttribute: string =
        (await attributes.nth(2).locator("span > span").nth(0).textContent()) ||
        "";
      const contractType: string = contractTypeAttribute
        .replaceAll("قرارداد", "")
        .trim();
      const salaryLocator = attributes.nth(2).locator("span > span").nth(1);

      const salaryAttribute: string = (await salaryLocator.count())
        ? (await salaryLocator.textContent()) || ""
        : "";
      const salary: string = salaryAttribute.replaceAll(/\(|\)|حقوق از/g, "");
      return {
        title: title.trim(),
        url,
        provider: EProvider.JOB_IN_JA,
        postedAt,
        contractType: convertPersianContractTypeToEContractType(contractType),
        salary,
        location,
        company,
      };
    } catch (error) {
      console.error(`Jobinja parser: ${error}`)
    }
  }

  private parseCompany(name: string): ICompany {
    const fullName = name.trim();
    const [persianName, englishName] = fullName
      .split("|", 2)
      .map((item) => item.trim());

    return {
      fullName,
      persianName,
      englishName,
    };
  }

  private parseLocation(name: string): ILocation {
    const country = LOCATION_COUNTRY;
    const fullName = name.trim();
    const [province] = fullName.split("،", 2).map((item) => item.trim());

    return {
      country,
      province,
    };
  }
}
