import { JobRepository } from './repositories'
import { JobService, JobVerificationService } from './services'
import { JobLinkChecker } from './crawlers/verification'
import dotenv from 'dotenv'
import { TelegramBot } from './telegram/telegram.bootstrap'

dotenv.config()

const repository = new JobRepository()
const jobService = new JobService(repository)
const verificationService = new JobVerificationService(
  repository,
  new JobLinkChecker(),
  Number(process.env.JOB_VERIFY_CACHE_MINUTES ?? 360),
)

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN

if (!telegramBotToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined!')
}

const telegramBot = new TelegramBot(telegramBotToken, jobService, verificationService)
telegramBot.start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Telegram bot failed:', error)
  process.exitCode = 1
})
