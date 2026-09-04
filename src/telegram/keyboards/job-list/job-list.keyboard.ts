import { InlineKeyboard } from "grammy"
import { IJobListKeyboard } from './job-list.model'
import { IJob } from "../../../types"
import { PAGINATION_LIMIT } from "../../../constants"

export class JobListKeyboard implements IJobListKeyboard {
  create(jobs: Array<IJob>, page: number): InlineKeyboard { 
    const keyboard = new InlineKeyboard()
    jobs.forEach((job, index) => {
      const jobIndex = index + 1 + (page - 1) * PAGINATION_LIMIT;
      keyboard.text(`${jobIndex}`, `jobs:${job.id}:${page}`)

      if ((index + 1) % 5 === 0) {
        keyboard.row();
      }
    })
    return keyboard
  }
}