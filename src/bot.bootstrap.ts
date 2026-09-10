import { JobRepository } from "./repositories";
import { JobService } from "./services";
import dotenv from "dotenv";
import { TelegramBot } from "./telegram/telegram.bootstrap";

dotenv.config();

const repository = new JobRepository();
const jobService = new JobService(repository);

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

if (!telegramBotToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is not defined!");
}

const telegramBot = new TelegramBot(telegramBotToken, jobService);
telegramBot.start();
