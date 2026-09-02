import { InlineKeyboard } from "grammy"
import { IJobListKeyboard } from './job-list.model'
import { IJob } from "../../../types"
import { PAGINATION_LIMIT } from "../../../constants"
import { JOB_DETAILS_KEYBOARD_PREFIX } from "../../telegram.constant"

export class JobListKeyboard implements IJobListKeyboard {
  create(jobs: Array<IJob>, page: number): InlineKeyboard { 
    const keyboard = new InlineKeyboard()
    jobs.forEach((job, index) => {
      const jobIndex = index + 1 + (page - 1) * PAGINATION_LIMIT;
      keyboard.text(`${jobIndex}`, `${JOB_DETAILS_KEYBOARD_PREFIX}:${job.id}:${page}`)

      if ((index + 1) % 5 === 0) {
        keyboard.row();
      }
    })
    return keyboard
  }
}