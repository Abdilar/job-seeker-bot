import cron from "node-cron";
import { ICrawlJobsTask } from "../../tasks";
import { ICrawlerScheduler } from "./crawler.model";

export class CrawlerScheduler implements ICrawlerScheduler {
  constructor(private readonly crawlJobs: ICrawlJobsTask) {}

  start(): void {
    cron.schedule(
      "0 10 * * *",
      async () => {
        try {
          await this.runWithJitter()
        } catch (error) {
          console.error("Crawler scheduler failed:", error);
        }
      },
      {
        timezone: "Asia/Tehran",
      },
    );
  }

  private async runWithJitter(): Promise<void> {
    const maxDelaySeconds = 600;
    const delay = Math.floor(Math.random() * maxDelaySeconds * 1_000);

    console.log(`Crawler will start in ${delay}ms`);

    await new Promise((resolve) => {
      setTimeout(resolve, delay);
    });

    console.log("Crawler started");

    await this.crawlJobs.run();
  }
}
