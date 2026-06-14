import * as cheerio from "cheerio";

async function run() {
  const url = "https://www.rareanimes.mov/hindi/naruto-all-season-hindi-tamil-telugu-bengali-malayalam-episodes-download-hd/";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log("=== Checking links inside entry-content ===");
    $(".entry-content a").each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href") || "";
      console.log(`Link ${i + 1}: "${text}" -> "${href}"`);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
