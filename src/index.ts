
import { Bot } from "grammy"
import dotenv from "dotenv"
import {start} from './providers/job-in-ja.provider'
import { IJob } from "./types/job.model"
import {prisma} from './database/prisma'
import { EProvider } from "./types/provider.model"

dotenv.config()

console.log(process.env.DATABASE_URL)

async function testDB() {
  const company = await prisma.company.create({
    data: {
      fullName: EProvider.JOB_IN_JA
    }
  })

  console.log({company})
}

testDB().catch(console.error).finally(() => prisma.$disconnect())

// const botToken = process.env.BOT_TOKEN

// if (!botToken) {
//   throw new Error('Bot token missing...')
// }

// const bot = new Bot(botToken)

// bot.command('start', async ctx => {
//   await ctx.reply('Hey, Welcome...\nLatest Software Engineer jobs on Jobinja')
//   const jobs: Array<IJob> = await start()
//   await ctx.reply(
//     showJobs(jobs), {
//       parse_mode: 'HTML'
//     }
//   )
// })

// // bot.on('message:text', async ctx => {
// //   await ctx.reply('Your message: ' + ctx.message.text)
// // })

// bot.start()

// // console.log('The bot has been started...')
// function showJobs(jobs: Array<IJob>): string {
//   const lines: Array<string> = []
//   jobs.forEach((job, index) => {
//     lines.push(`<b>${index + 1}. ${job.title}</b>`)
//     lines.push(`Contract Type: ${job.contractType}`)
//     lines.push(`Company: ${job.company.full_name}`)
//     if (job.location.city) {
//       lines.push(`Location: ${job.location.city}`)
//     }
//     if (job.salary) {
//       lines.push(`Salary: ${job.salary} T`)
//     }
//     if (job.postedAt) {
//       lines.push(`Posted at: ${job.postedAt}`)
//     }
//     lines.push("")
//   })
  
//   return lines.join("\n")
// }
