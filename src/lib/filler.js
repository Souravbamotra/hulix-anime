import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";

// Popular show title normalized to animefillerlist.com slug mapping
const SLUG_MAP = {
  "naruto shippuden": "naruto-shippuden",
  "naruto": "naruto",
  "one piece": "one-piece",
  "bleach": "bleach",
  "detective conan": "detective-conan",
  "black clover": "black-clover",
  "boruto: naruto next generations": "boruto-naruto-next-generations",
  "boruto": "boruto-naruto-next-generations",
  "fairy tail": "fairy-tail",
  "my hero academia": "my-hero-academia",
  "boku no hero academia": "my-hero-academia",
  "hunter x hunter (2011)": "hunter-x-hunter-2011",
  "hunter x hunter": "hunter-x-hunter-2011",
  "dragon ball z": "dragon-ball-z",
  "dragon ball super": "dragon-ball-super",
  "dragon ball": "dragon-ball",
  "dragon ball gt": "dragon-ball-gt",
  "gintama": "gintama",
};

function normalizeTitle(title) {
  if (!title) return "";
  return title.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

const NORMALIZED_SLUG_MAP = {};
for (const [key, val] of Object.entries(SLUG_MAP)) {
  NORMALIZED_SLUG_MAP[normalizeTitle(key)] = val;
}

export function getFillerSlug(romaji, english) {
  if (romaji) {
    const normRomaji = normalizeTitle(romaji);
    if (NORMALIZED_SLUG_MAP[normRomaji]) return NORMALIZED_SLUG_MAP[normRomaji];
  }
  if (english) {
    const normEnglish = normalizeTitle(english);
    if (NORMALIZED_SLUG_MAP[normEnglish]) return NORMALIZED_SLUG_MAP[normEnglish];
  }

  // Fallback: build a slug from romaji or english
  const baseTitle = english || romaji;
  if (!baseTitle) return null;
  return baseTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function fetchFillerList(slug) {
  if (!slug) return {};

  const cacheDir = path.join(process.cwd(), "cache", "filler");
  const cacheFile = path.join(cacheDir, `${slug}.json`);

  // Ensure cache directory exists
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Check cache (allow cache to live for 7 days since filler lists change slowly)
  if (fs.existsSync(cacheFile)) {
    try {
      const stats = fs.statSync(cacheFile);
      const isStale = Date.now() - stats.mtimeMs > 7 * 24 * 60 * 60 * 1000;
      if (!isStale) {
        const cachedData = fs.readFileSync(cacheFile, "utf-8");
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.error("[Filler Cache] Error reading cache file:", err);
    }
  }

  // Fetch from AnimeFillerList
  const url = `https://www.animefillerlist.com/shows/${slug}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      // If 404, we cache empty list to prevent spamming
      if (res.status === 404) {
        console.warn(`[Filler Scraper] 404 for show slug: ${slug}`);
        fs.writeFileSync(cacheFile, JSON.stringify({}), "utf-8");
        return {};
      }
      throw new Error(`AnimeFillerList returned status ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const fillers = {};

    $("table.EpisodeList tbody tr").each((_, el) => {
      const epNumText = $(el).find("td.Number").text().trim();
      const epNum = parseInt(epNumText, 10);
      if (isNaN(epNum)) return;

      const typeText = $(el).find("td.Type span").text().trim().toLowerCase();

      let status = "canon";
      if (typeText.includes("filler") && !typeText.includes("mixed")) {
        status = "filler";
      } else if (typeText.includes("mixed")) {
        status = "mixed";
      } else if (typeText.includes("anime canon")) {
        status = "anime_canon";
      }

      fillers[epNum] = status;
    });

    // Save to cache
    fs.writeFileSync(cacheFile, JSON.stringify(fillers), "utf-8");
    return fillers;
  } catch (err) {
    console.error(`[Filler Scraper] Failed to fetch filler list for ${slug}:`, err);
    // If we have a cached version (even if stale), fallback to it on error
    if (fs.existsSync(cacheFile)) {
      try {
        const cachedData = fs.readFileSync(cacheFile, "utf-8");
        return JSON.parse(cachedData);
      } catch (_) {}
    }
    return {};
  }
}
