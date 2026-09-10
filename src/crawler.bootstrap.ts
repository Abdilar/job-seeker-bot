import { JobInJaCreator } from "./crawlers";
import { JobRepository } from "./repositories";
import { CrawlerScheduler } from "./scheduler";
import { JobService } from "./services";
import { CrawlJobsTask } from "./tasks";

const repository = new JobRepository();
const jobService = new JobService(repository);

const providers = [
  new JobInJaCreator()
]

const crawlJobsTask = new CrawlJobsTask(jobService, providers)

const scheduler = new CrawlerScheduler(
  crawlJobsTask,
);

scheduler.start();