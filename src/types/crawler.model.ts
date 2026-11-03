import type { ECrawlJobMode, ECrawlMode } from '../constants'
import type { EProvider } from './provider.model'

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
      mode?: ECrawlMode
    }
  | Record<string, never>

export type CrawlerJobArgumentsType =
  | {
      provider?: EProvider
      mode?: ECrawlJobMode
    }
  | Record<string, never>
