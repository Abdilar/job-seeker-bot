import type { ECrawlMode } from '../../constants'
import type { JobProvider } from '../../crawlers'
import { JobInJaCreator } from '../../crawlers'
import type { IJobService } from '../../services'
import { EProvider } from '../../types'

export function providerCreator(
  provider: EProvider,
  service: IJobService,
  mode?: ECrawlMode,
): JobProvider | undefined {
  // TODO: add all providers
  switch (provider) {
    case EProvider.JOB_IN_JA:
      return new JobInJaCreator(service, mode)
    default:
      break
  }
}
