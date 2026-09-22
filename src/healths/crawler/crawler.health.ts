import 'dotenv/config'

import { prisma } from '../../database/prisma'

async function checkDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`
}

async function checkBotHealth(): Promise<void> {
  await checkDatabase()

  // eslint-disable-next-line no-console
  console.log('Crawler health check passed')
}

async function main(): Promise<void> {
  try {
    await checkBotHealth()
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Crawler health check failed:', error)

    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

void main()
