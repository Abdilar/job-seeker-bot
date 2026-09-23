import 'dotenv/config'

import { prisma } from '../../database/prisma'
import { CrawlerExecutionRepository } from '../../repositories'
import { CrawlerExecutionHealthService } from '../../services'

async function checkDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`
}

async function checkCrawlerHealth(): Promise<void> {
  await checkDatabase()

  const repository = new CrawlerExecutionRepository()
  const healthService = new CrawlerExecutionHealthService(repository)

  const result = await healthService.check()
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      service: 'crawler',
      infrastructure: 'HEALTHY',
      execution: result.status,
      message: result.message,
      checkedAt: new Date().toISOString(),
    }),
  )
}

async function main(): Promise<void> {
  try {
    await checkCrawlerHealth()
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Crawler health check failed:', error)

    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

void main()
