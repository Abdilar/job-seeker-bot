import { JobInJaCreator } from "./crawlers";
import { JobRepository } from "./repositories";
import { JobService } from "./services";
import { CrawlJobsTask } from "./tasks";

const repository = new JobRepository();
const jobService = new JobService(repository);

const providers = [
  new JobInJaCreator()
]

const crawlJobs = new CrawlJobsTask(jobService, providers)
crawlJobs.run().catch(console.error)