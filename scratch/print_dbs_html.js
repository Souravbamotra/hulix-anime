import * as cheerio from "cheerio";

async function test() {
  const slug = "hindi/dragon-ball-super-all-hindi-episodes-download-hd-complete-series";
  const url = `https://www.rareanimes.mov/${slug}/`;
  
  console.log("Fetching Dragon Ball Super Main Page HTML...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log("\n--- .entry-content Outer HTML ---");
  console.log($(".entry-content").html()?.slice(0, 3000));
}

test().catch(err => console.error(err));
