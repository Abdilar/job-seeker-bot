import dotenv from "dotenv";
import { IJob } from "./types/job.model";
import { prisma } from "./database/prisma";
import { EProvider } from "./types/provider.model";
import { JobInJaCreator } from "./providers";
import fs from "node:fs";
import { JobService } from "./services/job";
import { JobRepository } from "./repositories/job";
import { TelegramBot } from "./telegram";

dotenv.config();

console.log(process.env.DATABASE_URL);

async function main() {
  try {
    // const provider = new JobInJaCreator();
    // const jobs = await provider.crawlJobs();
    // console.log("Provider: fetched jobs...");
    // provider.closeBrowser();
    // fs.writeFile("./crawled-data/jobinja.json", JSON.stringify(jobs), (err) => {
    //   if (err) {
    //     console.error(err);
    //   }
    // });

    // const repository = new JobRepository();
    // const jobService = new JobService(repository);
    // const beforeSave = await repository.count();
    // await jobService.saveAll(jobs);
    // const afterSave = await repository.count();
    // console.log("Service: jobs saved 🎉", { beforeSave, afterSave });

    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN

    if (!telegramBotToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined!')
    }

    const telegramBot = new TelegramBot(telegramBotToken)
    telegramBot.start()

  } catch (error) {
    console.error("Error: " + error);
  }
}

main();
