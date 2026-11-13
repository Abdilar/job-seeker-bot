import type { ECrawlJobMode } from '../../constants'
import type { JobProvider } from '../../crawlers'
import { JobInJaCreator } from '../../crawlers'
import type { IJobService } from '../../services'
import { EProvider } from '../../types'

export function providerCreator(
  service: IJobService,
  provider?: EProvider,
  jobMode?: ECrawlJobMode,
): JobProvider {
  // TODO: add all providers
  switch (provider) {
    case EProvider.JOB_IN_JA:
      return new JobInJaCreator(service, jobMode)
    default:
      return new JobInJaCreator(service, jobMode)
  }
}
