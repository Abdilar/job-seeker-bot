import { ECrawlerStatus } from '../../types'
import type {
  ICrawlerExecutionHealthService,
  ICrawlerHealthResult,
  IExecutionReader,
} from './crawler-execution.model'

export class CrawlerExecutionHealthService implements ICrawlerExecutionHealthService {
  constructor(private readonly executionReader: IExecutionReader) {}

  async check(): Promise<ICrawlerHealthResult> {
    const execution = await this.executionReader.getLatestExecution()

    const now = new Date()
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)

    const currentHour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tehran',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(now),
    )

    const deadlinePassed = currentHour >= 11

    if (!execution) {
      return {
        status: deadlinePassed ? 'OVERDUE' : 'PENDING',
        message: 'No crawler execution found',
      }
    }

    const executionDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(execution.startedAt)

    const isToday = executionDate === today

    if (!isToday) {
      return {
        status: deadlinePassed ? 'OVERDUE' : 'PENDING',
        message: 'Crawler has not executed today',
        execution,
      }
    }

    if (execution.status === ECrawlerStatus.SUCCESS) {
      return {
        status: 'HEALTHY',
        message: 'Crawler completed successfully',
        execution,
      }
    }

    if (execution.status === ECrawlerStatus.FAILED) {
      return {
        status: 'FAILED',
        message: execution.error ?? 'Crawler execution failed',
        execution,
      }
    }

    return {
      status: deadlinePassed ? 'OVERDUE' : 'PENDING',
      message: deadlinePassed
        ? 'Crawler execution exceeded its deadline'
        : 'Crawler execution is in progress',
      execution,
    }
  }
}
