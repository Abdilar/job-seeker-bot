import { Context } from "grammy";

export interface IStartHandler {
  handle(context: Context): Promise<void>
}