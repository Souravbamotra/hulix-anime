import * as cheerio from "cheerio";

async function run() {
  const url = "https://www.rareanimes.mov/hindi/one-piece-season-22-episodes-hindi-dubbed-download-hd/";
  console.log(`Fetching ${url}...`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  
  // Search for occurrence of numbers in the range 1080 - 1160
  for (let num = 1080; num <= 1160; num++) {
    const idx = html.indexOf(String(num));
    if (idx !== -1) {
      console.log(`Found reference to ${num} at index ${idx}:`);
      console.log(html.substring(Math.max(0, idx - 100), Math.min(html.length, idx + 100)).replace(/\s+/g, " "));
    }
  }
}

run().catch(console.error);
