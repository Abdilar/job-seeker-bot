import type { IExtractedJob } from '../types'

export class JobExtractionApi {
  private baseUrl: string | undefined
  private apiKey: string | undefined

  constructor() {
    this.baseUrl = process.env.API_BASE_URL
    this.apiKey = process.env.AI_AUTOMATION_PLATFORM_API_KEY
  }

  async extractJobDetail(content: string): Promise<IExtractedJob> {
    // eslint-disable-next-line no-console
    console.log('JobExtractionApi: extractJobDetail(content) -> apiKey: ', {
      key: this.apiKey,
      content,
    })

    const response = await fetch(`${this.baseUrl}/v1/jobs/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': `${this.apiKey}`,
      },
      body: JSON.stringify({ text: content }),
    })

    if (!response.ok) {
      throw new Error(`Extraction API failed: ${response.status}`)
    }

    const responseBody: unknown = await response.json()
    const { data } = responseBody as { data: IExtractedJob }
    // eslint-disable-next-line no-console
    console.log('JobExtractionApi: extractJobDetail(content) -> response: ', { response: data })
    return data
  }
}
