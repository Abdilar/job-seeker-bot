import cron from "node-cron";
import { ICrawlJobsTask } from "../../tasks";
import { ICrawlerScheduler } from "./crawler.model";
import { randomDelay } from "../../utilities";

export class CrawlerScheduler implements ICrawlerScheduler {
  private isRunning = false;

  constructor(private readonly crawlJobs: ICrawlJobsTask) {}

  start(): void {
    cron.schedule(
      "0 10 * * *",
      async () => {
        try {
          await this.runWithJitter();
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
    if (this.isRunning) {
      console.log("Crawler is already running. Skipping...");
      return;
    }

    this.isRunning = true;

    try {
      const maxDelaySeconds = 600;
      await randomDelay(0, maxDelaySeconds);

      await this.crawlJobs.run();
    } finally {
      this.isRunning = false;
    }
  }
}
