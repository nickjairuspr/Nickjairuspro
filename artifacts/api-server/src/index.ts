import app from "./app.js";
import { logger } from "./lib/logger.js";
import cron from "node-cron";
import { scrapeManga, getLastData, setNextScheduled } from "./scraper.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  const existingData = getLastData();
  if (!existingData) {
    logger.info("No existing manga data found, running initial scrape...");
    scrapeManga().catch((err) => {
      logger.error({ err }, "Initial scrape failed");
    });
  } else {
    logger.info({ count: existingData.count, timestamp: existingData.timestamp }, "Loaded existing manga data");
  }

  const CRON_SCHEDULE = "0 */6 * * *";
  const job = cron.schedule(CRON_SCHEDULE, async () => {
    logger.info("Scheduled scrape starting");
    try {
      const result = await scrapeManga();
      logger.info({ count: result.count }, "Scheduled scrape complete");
    } catch (err) {
      logger.error({ err }, "Scheduled scrape failed");
    }
    const next = new Date();
    next.setHours(next.getHours() + 6, 0, 0, 0);
    setNextScheduled(next);
  });

  job.start();

  const next = new Date();
  next.setHours(next.getHours() + 6, 0, 0, 0);
  setNextScheduled(next);

  logger.info({ schedule: CRON_SCHEDULE }, "Cron job scheduled (every 6 hours)");
});
