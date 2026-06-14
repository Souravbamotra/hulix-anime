import * as cheerio from "cheerio";
async function test() {
  const url = "https://store.animetoonhindi.com/archives/10984";
  console.log("Fetching animetoon link...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  console.log("Status:", res.status);
  console.log("Final URL:", res.url);
  const html = await res.text();
  const $ = cheerio.load(html);
  console.log("Entry Content HTML:");
  console.log($(".entry-content").html() || $("body").html()?.slice(0, 15000));
}

test();
