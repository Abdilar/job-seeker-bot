import type { IJobRepository } from '../../repositories/job'
import type { IJobExpirationService } from './job-expiration.model'

export class JobExpirationService implements IJobExpirationService {
  constructor(private readonly repository: IJobRepository) {}

  expireOlderThan(cutoff: Date): Promise<number> {
    return this.repository.expireOlderThan(cutoff)
  }
}
