import * as cheerio from "cheerio";

async function run() {
  const url = "https://www.rareanimes.mov/hindi/naruto-season-4-hindi-episodes-download-hd/";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log("=== Raw HTML around Episode 1 ===");
    let count = 0;
    $(".entry-content").children().each((i, el) => {
      const outerHtml = $.html(el);
      if (outerHtml.includes("Episode 1") || outerHtml.includes("Episode 2") || count > 0) {
        console.log(`Element ${i}:`, outerHtml);
        count++;
        if (count > 8) return false; // break
      }
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
