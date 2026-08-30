import { Context } from "grammy"
import { IJobHandler } from './job.model'

export class JobHandler implements IJobHandler {
  async handle(context: Context): Promise<void> { }
}