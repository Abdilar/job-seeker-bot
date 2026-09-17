import semanticRelease from 'semantic-release'
import { appendFile } from 'fs/promises'

const release = await semanticRelease()

if (!release) {
  console.log('No new release!')
  process.exit(0)
}

const nextVersion = release.nextRelease.version
console.log(`Released ${nextVersion}...`)

if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `version=v${nextVersion}\n`)
}
