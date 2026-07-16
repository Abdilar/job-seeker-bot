
import { Bot } from "grammy"
import dotenv from "dotenv"

dotenv.config()

const botToken = process.env.BOT_TOKEN

if (!botToken) {
  throw new Error('Bot token missing...')
}

const bot = new Bot(botToken)

bot.command('start', async ctx => {
  await ctx.reply('Hey, Welcome...')
})

bot.on('message:text', async ctx => {
  await ctx.reply('Your message: ' + ctx.message.text)
})

bot.start()

console.log('The bot has been started...')