export interface IJobExpirationService {
  expireOlderThan(cutoff: Date): Promise<number>
}
