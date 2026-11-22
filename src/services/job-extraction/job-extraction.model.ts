import type { IExtractedJob } from '../../types'

export interface IJobExtractionService {
  extractJobDetail(content: string): Promise<IExtractedJob>
}
