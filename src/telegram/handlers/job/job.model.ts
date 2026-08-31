import { Context } from "grammy"

export interface IJobHandler {
  handle(context: Context, page?: number): Promise<void>
}