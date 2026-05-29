import { Router, type IRouter } from "express";
import {
  ListMangaQueryParams,
  SearchMangaQueryParams,
  GetMangaParams,
} from "@workspace/api-zod";
import {
  scrapeManga,
  getLastData,
  getIsRunning,
  getNextScheduled,
  type MangaEntry,
} from "../scraper.js";

const router: IRouter = Router();

router.get("/manga/status", (_req, res) => {
  const data = getLastData();
  const nextScheduled = getNextScheduled();
  res.json({
    lastScraped: data?.timestamp ?? null,
    total: data?.count ?? 0,
    isRunning: getIsRunning(),
    nextScheduled: nextScheduled ? nextScheduled.toISOString() : null,
  });
});

router.get("/manga/search", (req, res) => {
  const parsed = SearchMangaQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Missing required query parameter: q" });
    return;
  }

  const { q } = parsed.data;
  const data = getLastData();
  if (!data) {
    res.json({ mangas: [], total: 0, page: 1, limit: 50 });
    return;
  }

  const lower = q.toLowerCase();
  const filtered = data.mangas.filter((m) =>
    m.title.toLowerCase().includes(lower)
  );
  res.json({
    mangas: filtered,
    total: filtered.length,
    page: 1,
    limit: filtered.length,
  });
});

router.get("/manga/:id", (req, res) => {
  const parsed = GetMangaParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Invalid parameters" });
    return;
  }

  const data = getLastData();
  if (!data) {
    res.status(404).json({ error: "not_found", message: "No manga data available yet" });
    return;
  }

  const manga = data.mangas.find((m: MangaEntry) => m.id === parsed.data.id);
  if (!manga) {
    res.status(404).json({ error: "not_found", message: "Manga not found" });
    return;
  }

  res.json(manga);
});

router.get("/manga", (req, res) => {
  const parsed = ListMangaQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;

  const data = getLastData();
  if (!data) {
    res.json({ mangas: [], total: 0, page, limit });
    return;
  }

  const start = (page - 1) * limit;
  const paged = data.mangas.slice(start, start + limit);
  res.json({ mangas: paged, total: data.count, page, limit });
});

router.post("/scrape", async (req, res) => {
  if (getIsRunning()) {
    res.status(409).json({ error: "conflict", message: "A scrape is already in progress" });
    return;
  }

  try {
    const result = await scrapeManga();
    res.json({
      success: true,
      count: result.count,
      timestamp: result.timestamp,
      message: `Successfully scraped ${result.count} manga`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log?.error({ err }, "Scrape endpoint failed");
    res.status(500).json({ error: "scrape_failed", message });
  }
});

export default router;
