import type { ECrawlJobMode, ECrawlMode } from '../../constants'
import type { JobProvider } from '../../crawlers'
import { JobInJaCreator } from '../../crawlers'
import type { IJobService } from '../../services'
import { EProvider } from '../../types'

export function providerCreator(
  service: IJobService,
  provider?: EProvider,
  jobMode?: ECrawlJobMode,
  crawlMode?: ECrawlMode,
): JobProvider {
  // eslint-disable-next-line no-console
  console.log('crawl: providerCreator(service, provider, jobMode)')

  // TODO: add all providers
  switch (provider) {
    case EProvider.JOB_IN_JA:
      return new JobInJaCreator(service, jobMode, crawlMode)
    default:
      return new JobInJaCreator(service, jobMode, crawlMode)
  }
}
