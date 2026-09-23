export interface ICrawlerExecutionRepository {
  create(): Promise<string>
  markSuccess(id: string): Promise<void>
  markFailed(id: string, error: string): Promise<void>
}
