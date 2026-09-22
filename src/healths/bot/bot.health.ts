import { prisma } from '../../database/prisma'
import type { ITelegramResponse } from './bot.model'

async function checkTelegram(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined')
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
    signal: AbortSignal.timeout(5000),
  })

  const result = (await response.json()) as ITelegramResponse

  if (!response.ok || !result.ok) {
    throw new Error(result.description ?? 'Telegram API health check failed')
  }
}

async function checkDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`
}

async function checkBotHealth(): Promise<void> {
  await Promise.all([checkTelegram(), checkDatabase()])

  // eslint-disable-next-line no-console
  console.log('Bot health check passed')
}

async function main(): Promise<void> {
  try {
    await checkBotHealth()
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Bot health check failed:', error)

    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

void main()
