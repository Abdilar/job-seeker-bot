import type { JobExtractionApi } from '../../api'
import type { IExtractedJob } from '../../types'
import type { IJobExtractionService } from './job-extraction.model'

export class JobExtractionService implements IJobExtractionService {
  constructor(private readonly api: JobExtractionApi) {}

  async extractJobDetail(content: string): Promise<IExtractedJob> {
    const data: IExtractedJob = await this.api.extractJobDetail(content)
    // eslint-disable-next-line no-console
    console.log('JobExtractionService: extractJobDetail(content) -> response: ', { response: data })
    return data
  }
}
