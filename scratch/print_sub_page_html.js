import * as cheerio from "cheerio";

async function run() {
  const url = "https://www.rareanimes.mov/hindi/dragon-ball-super-season-1-god-of-destruction-beerus-saga-hindi-episodes-download-01/";
  console.log(`Fetching sub-page: ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log("\n--- Page title:", $("title").text());
  console.log("\n--- .entry-content HTML slice (characters 10000 to 40000):");
  console.log($(".entry-content").html()?.slice(10000, 40000));
}

run();
