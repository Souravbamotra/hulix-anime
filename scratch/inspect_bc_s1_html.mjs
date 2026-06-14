import * as cheerio from "cheerio";

async function run() {
  const url = "https://www.rareanimes.mov/hindi/black-clover-season-02-episodes-hindi-dubbed-download-hd/";
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    console.log(`Status: ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log("Title:", $(".entry-title").text().trim());
    console.log("Length of HTML:", html.length);

    console.log("\nChildren of entry-content:");
    $(".entry-content").children().each((i, el) => {
      console.log(`${i}: <${el.name}> Text: "${$(el).text().trim().substring(0, 100)}"`);
    });
  } catch (e) {
    console.error("Error:", e.message);
  }
}

run().catch(console.error);
