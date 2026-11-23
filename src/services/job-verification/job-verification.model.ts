import type { IJob } from '../../types'

export interface IJobVerificationService {
  verify(job: IJob): Promise<IJob>
}
