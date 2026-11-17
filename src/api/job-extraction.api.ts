export class JobExtractionApi {
  private baseUrl: string | undefined

  constructor() {
    this.baseUrl = process.env.API_BASE_URL
  }

  async extractJobDetail(content: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/jobs/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) {
      throw new Error(`Extraction API failed: ${response.status}`)
    }

    return (await response.json()) as unknown
  }
}
