import * as cheerio from "cheerio";

async function run() {
  const url = "https://www.rareanimes.mov/hindi/naruto-season-9-hindi-dubbed-episodes-download-hd/";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log("=== Checking episode texts in entry-content for Season 9 ===");
    $(".entry-content").find("p, strong, a").each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes("Episode") || text.includes("EP")) {
        console.log(`Tag: <${el.name}>, Text: "${text.substring(0, 100)}"`);
      }
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
