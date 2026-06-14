import * as cheerio from "cheerio";

async function test() {
  const url = "https://9anime.org.lv/naruto-dub-episode-220/";
  console.log("Fetching episode player page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  
  // Search for kiwikSubContainer or kiwikDubContainer in the raw HTML string
  console.log("Search results for kiwikSubContainer/kiwikDubContainer in HTML:");
  const lines = html.split("\n");
  lines.forEach((line, index) => {
    if (line.includes("kiwikSubContainer") || line.includes("kiwikDubContainer") || line.includes("buttonContainer")) {
      console.log(`Line ${index + 1}: ${line.trim().slice(0, 300)}`);
    }
  });
}

test();
