/// <reference lib="dom" />
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = "https://mangabuddy1.co.uk/home";
const DATA_FILE = path.resolve(__dirname, "../manga_data.json");

const CHROME_PATHS = [
  "/usr/bin/chrome-headless-shell",
  "/usr/bin/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
];

function findChrome(): string | undefined {
  for (const p of CHROME_PATHS) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return undefined;
}

export interface MangaEntry {
  id: string;
  title: string;
  url: string | null;
  image: string | null;
}

export interface MangaData {
  timestamp: string;
  count: number;
  mangas: MangaEntry[];
}

let isRunning = false;
let lastData: MangaData | null = null;
let nextScheduledRun: Date | null = null;

function generateId(title: string, index: number): string {
  return `${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
}

function loadFromDisk(): MangaData | null {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw) as MangaData;
      logger.info(
        { count: parsed.count, timestamp: parsed.timestamp },
        "Loaded manga data from disk"
      );
      return parsed;
    }
  } catch (err) {
    logger.warn({ err }, "Failed to load manga data from disk");
  }
  return null;
}

export function getLastData(): MangaData | null {
  if (!lastData) {
    lastData = loadFromDisk();
  }
  return lastData;
}

export function getIsRunning(): boolean {
  return isRunning;
}

export function getNextScheduled(): Date | null {
  return nextScheduledRun;
}

export function setNextScheduled(date: Date): void {
  nextScheduledRun = date;
}

export async function scrapeManga(): Promise<MangaData> {
  if (isRunning) {
    throw new Error("Scraper is already running");
  }

  isRunning = true;
  const chromePath = findChrome();
  logger.info({ chromePath }, "Scraper starting");

  let browser;
  try {
    const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
      ],
    };
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    logger.info({ url: BASE_URL }, "Navigating to manga source");
    await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise<void>((resolve) => setTimeout(resolve, 5000));

    type RawManga = { title: string; url: string | null; image: string | null };

    const rawMangas: RawManga[] = await page.evaluate((): RawManga[] => {
      const results: RawManga[] = [];

      const links = document.querySelectorAll("a");
      links.forEach((link: HTMLAnchorElement) => {
        const href = link.href;
        const text = link.innerText?.trim();
        if (
          href &&
          (href.includes("/manga/") ||
            href.includes("/read/") ||
            href.includes("/series/")) &&
          text &&
          text.length > 0 &&
          text.length < 100
        ) {
          results.push({
            title: text.replace(/\n/g, " ").trim(),
            url: href,
            image: (link.querySelector("img") as HTMLImageElement | null)?.src ?? null,
          });
        }
      });

      const cards = document.querySelectorAll(
        "[class*='manga'], [class*='story'], [class*='item']"
      );
      cards.forEach((card: Element) => {
        const titleEl = card.querySelector("h3, h4, .title, a") as HTMLElement | null;
        const title = titleEl?.innerText?.trim();
        const linkEl = card.querySelector("a") as HTMLAnchorElement | null;
        const link = linkEl?.href ?? null;
        const img = (card.querySelector("img") as HTMLImageElement | null)?.src ?? null;
        if (title && title.length > 0 && title.length < 100) {
          results.push({
            title: title.replace(/\n/g, " ").trim(),
            url: link,
            image: img,
          });
        }
      });

      const seen = new Set<string>();
      const unique: RawManga[] = [];
      for (const m of results) {
        if (!seen.has(m.title)) {
          seen.add(m.title);
          unique.push(m);
        }
      }
      return unique;
    });

    const mangas: MangaEntry[] = rawMangas
      .slice(0, 200)
      .map((m, i) => ({ ...m, id: generateId(m.title, i) }));

    const output: MangaData = {
      timestamp: new Date().toISOString(),
      count: mangas.length,
      mangas,
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2));
    lastData = output;
    logger.info({ count: mangas.length }, "Scrape complete, data saved");
    return output;
  } catch (err) {
    logger.error({ err }, "Scraper error");
    throw err;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    isRunning = false;
  }
}
