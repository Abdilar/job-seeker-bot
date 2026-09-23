export interface ICrawlerExecutionService {
  start(): Promise<string>
  success(id: string): Promise<void>
  failed(id: string, error: string): Promise<void>
}
