import * as cheerio from "cheerio";

async function run() {
  const keyword = "Jujutsu Kaisen";
  const url = `https://www.rareanimes.mov/?s=${encodeURIComponent(keyword)}`;
  console.log(`[Test] Searching: ${url}`);
  
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
  
  console.log("Search Results:", JSON.stringify(results, null, 2));
}

run().catch(console.error);
