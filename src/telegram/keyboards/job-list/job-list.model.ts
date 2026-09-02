import { InlineKeyboard } from "grammy"
import { IJob } from "../../../types"

export interface IJobListKeyboard {
  create(jobs: Array<IJob>, page: number): InlineKeyboard 
}