import * as cheerio from "cheerio";
import { getRareAnimesEpisodes } from "../src/lib/scraper.js";

async function run() {
  const url = "https://www.rareanimes.mov/hindi/doraemon-all-season-hindi-episodes-download-hd/";
  console.log("Fetching index page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const seasons = [];
  $(".entry-content a").each((i, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") || "";
    const lowerText = text.toLowerCase();
    
    if (href && (lowerText.includes("season") && !lowerText.includes("all"))) {
      seasons.push({ text, href });
    }
  });

  console.log(`Found ${seasons.length} seasons on the page.`);
  
  let grandTotal = 0;
  for (const s of seasons) {
    console.log(`Resolving redirect for ${s.text} (${s.href})...`);
    try {
      const redirectRes = await fetch(s.href, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
      });
      const resolvedUrl = redirectRes.url;
      const resolvedSlug = resolvedUrl.replace("https://www.rareanimes.mov/", "").replace(/\/$/, "");
      console.log(`  -> Resolved slug: ${resolvedSlug}`);
      
      const episodes = await getRareAnimesEpisodes(resolvedSlug);
      console.log(`  -> Parsed ${episodes.length} episodes`);
      grandTotal += episodes.length;
    } catch (err) {
      console.error(`  -> Error resolving ${s.text}:`, err.message);
    }
  }
  
  console.log(`\nGrand total episodes from all seasons on the index page: ${grandTotal}`);
}

run().catch(err => {
  console.error(err);
});
