import type { EProvider } from '@prisma/client'

export enum ECrawlerStatus {
  FAILED = 'failed',
  SUCCESS = 'success',
  RUNNING = 'running',
}

export interface ICrawlerExecution {
  id: string
  status: ECrawlerStatus
  startedAt: Date
  finishedAt?: Date
  error?: string
  createdAt: Date
}

export type CrawlerFullArgumentsType =
  | {
      providers?: EProvider[]
      company?: string
    }
  | Record<string, never>
