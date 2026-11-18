import type { EProvider, IJobStatusCheck, IJobStatusTarget } from '../../types'

export interface IJobStatusChecker {
  supports(provider: EProvider): boolean
  check(target: IJobStatusTarget): Promise<IJobStatusCheck>
}
