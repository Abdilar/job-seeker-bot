import { Context } from "grammy"

export interface IJobHandler {
  handle(context: Context): Promise<void>
}