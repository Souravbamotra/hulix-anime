import { findRareAnimesSlug, getRareAnimesEpisodes } from "../src/lib/scraper.js";
import * as cheerio from "cheerio";

async function run() {
  const keyword = "One Piece";
  const url = `https://www.rareanimes.mov/?s=${encodeURIComponent(keyword)}`;
  console.log(`[Test] Searching RareAnimes for: ${url}`);
  
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const results = [];
  $("article").each((i, el) => {
    const titleLink = $(el).find("h2.entry-title a, .entry-title a").first();
    const href = titleLink.attr("href");
    const title = titleLink.text().trim();
    if (href) {
      const slug = href.replace("https://www.rareanimes.mov/", "").replace(/\/$/, "");
      results.push({ title, slug });
    }
  });
  
  console.log("Found search results on RareAnimes:", JSON.stringify(results, null, 2));

  console.log("\nTrying to resolve RareAnimes slug via findRareAnimesSlug...");
  const slug = await findRareAnimesSlug("One Piece", "One Piece", "TV");
  console.log("Resolved Slug:", slug);

  if (slug) {
    console.log("\nFetching episodes for resolved slug...");
    const episodes = await getRareAnimesEpisodes(slug);
    console.log(`Parsed ${episodes.length} episodes`);
    if (episodes.length > 0) {
      console.log("First episode:", episodes[0]);
      console.log("Last episode:", episodes[episodes.length - 1]);
    }
  }
}

run().catch(console.error);
