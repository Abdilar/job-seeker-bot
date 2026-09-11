import { TelegramContextType } from '../../telegram.model'

export interface IJobRenderer {
  render(context: TelegramContextType, page?: number, edit?: boolean): Promise<void>
}
