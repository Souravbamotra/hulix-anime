import * as cheerio from "cheerio";

async function test() {
  const url = "https://9anime.org.lv/naruto-dub-episode-220/";
  console.log("Fetching episode player page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log("\n--- .mirror HTML: ---");
  console.log($(".mirror").prop("outerHTML") || "not found");
}

test();
