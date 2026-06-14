import * as cheerio from "cheerio";

async function inspectPage(slug) {
  const url = `https://www.rareanimes.mov/${slug}/`;
  console.log(`\n=== Fetching text from: ${url} ===`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log("Page Heading:", $(".entry-title").text().trim());
  
  // Let's print out the first 2000 characters of entry-content
  const text = $(".entry-content").text().trim().replace(/\s+/g, " ");
  console.log("Content Preview:", text.substring(0, 1500));
}

async function run() {
  await inspectPage("hindi/one-piece-season-20-episodes-hindi-dubbed-download-hd");
  await inspectPage("hindi/one-piece-season-22-episodes-hindi-dubbed-download-hd");
}

run().catch(console.error);
